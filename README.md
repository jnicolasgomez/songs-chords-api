# Bandmate API

REST API powering [bandmatemusic.com](https://www.bandmatemusic.com) — a PWA that musicians use to manage chord sheets, setlists, and band rehearsals.

Express 5 · TypeScript · Node 22 · Firestore + MongoDB · Firebase Auth · Streaming LLM chat · Deployed on Google App Engine

[![Node.js CI](https://github.com/jnicolasgomez/songs-chords-api/actions/workflows/node.js.yml/badge.svg)](https://github.com/jnicolasgomez/songs-chords-api/actions/workflows/node.js.yml)

---

## What this is

A production API serving a real user base, not a tutorial project. It has been in continuous development since October 2023 (150+ commits) and ships to production automatically on every green build.

It handles multi-tenant song and setlist data with per-resource collaborator permissions, two different databases chosen per access pattern, and a streaming AI assistant with pluggable model providers.

**Highlights for reviewers:**

| | |
|---|---|
| **Zero build step** | Node 22 native TypeScript execution — no `tsc`, no bundler, no `dist/`. Source runs directly in dev and prod. |
| **97 tests, 7 suites** | Controllers are pure functions of an injected store, so the whole domain layer is tested without touching a database. |
| **Two databases, on purpose** | Firestore for read-heavy document access; MongoDB for setlists that need rich relational-style queries. One `Store<T>` interface over both. |
| **Defense in depth** | Helmet, tiered rate limits, Zod schema validation, glob-aware CORS, JWT verification, and explicit ownership checks on every mutation. |
| **Streaming AI** | Token-by-token SSE-style streaming with provider switching (Gemini / Anthropic), request cancellation, and normalized provider errors. |

---

## Architecture

```
Vue 3 PWA  ──Bearer: Firebase ID token──►  Express 5 API  ──►  Firestore   (songs, artists, users, notes)
                                                │              MongoDB     (setlists)
                                                └──────────►   Gemini / Anthropic  (streaming chat)
```

### Request pipeline

```
helmet → bodyParser → morgan(structured logger) → cors(glob whitelist)
  → globalLimiter → /api router
      → requireAuth | conditionalAuth   (Firebase Admin JWT)
      → writeLimiter | aiChatLimiter     (tiered by cost)
      → validate(ZodSchema)              (body parsed & narrowed)
      → controller(store)                (pure, injected dependency)
  → Sentry error handler
```

### Dependency injection by convention

Every domain follows the same three-file shape:

```
domain/components/
  controller.ts   export default (store?) => ({ ...methods })   ← pure, testable
  index.ts        controller(realStore)                          ← singleton wiring
  routes.ts       HTTP layer, swagger docs, middleware chain     ← thin
```

The controller factory falls back to the real store when none is passed, so production wiring stays a one-liner while tests inject a mock store. This is why the test suite runs in ~3 seconds with no test containers, no emulators, and no fixtures to reset.

### The dual-database decision

Both stores implement the same `Store<T>` interface but expose different query signatures rather than pretending to be identical:

```ts
// src/store/firestore.ts
query(table, [[field, op, value], ...])   // tuple conditions

// src/store/mongoStore.ts
query(table, mongoFilterObject)           // native Mongo filter
```

Forcing a lowest-common-denominator query language over both would have thrown away Mongo's aggregation power and Firestore's index model. Keeping the signatures honest costs one generic parameter and makes each call site read like the database it targets.

Firestore reads go through a TTL cache (`src/store/cache.ts`) with prefix-scoped invalidation — `invalidate("songs")` clears every `songs:*` key on write, so list endpoints stay fast without serving stale data after a mutation.

### Authorization model

Authentication and authorization are separated deliberately:

- **`src/middleware/session.ts`** answers *who are you* — verifies the Firebase ID token. `requireAuth` always enforces it; `conditionalAuth` only enforces it when a `userId` query param or `:id` route param is present, so public browsing endpoints stay open.
- **`src/middleware/authz.ts`** answers *may you touch this* — `assertOwner` for destructive operations, `assertCanEdit` for owner-or-collaborator access via the resource's `shared_with` array.

Collaboration is a first-class concept: songs and setlists both expose `POST/DELETE /:id/collaborators`, and edit permission resolves to `user_uid === uid || shared_with.includes(uid)`.

### Rate limiting is tiered by cost

| Limiter | Window | Max | Keyed by |
|---|---|---|---|
| `globalLimiter` | 15 min | 500 | IP |
| `writeLimiter` | 15 min | 30 | IP |
| `aiChatLimiter` | 60 min | 10 | **Firebase UID**, falling back to IP |

The AI limiter keys on authenticated user rather than IP, so a shared NAT or office network can't exhaust one user's quota — and a user can't reset their own quota by switching networks.

### Streaming AI chat

`POST /api/ai/chat` is the one endpoint that bypasses the standard response envelope. It writes `text/plain; charset=utf-8` chunks incrementally via the Vercel AI SDK:

- **Provider switching** — `provider: "anthropic"` routes through the AI Gateway; the default goes direct to Gemini.
- **Cancellation** — `req.on("close")` aborts the `AbortController`, so a user closing the tab stops the upstream generation instead of burning tokens.
- **Error normalization** — provider failures arrive as `error` *stream events*, not thrown exceptions. The handler unwraps nested `responseBody` JSON to surface a real status code and message when headers haven't been sent yet, and cleanly ends the stream when they have.
- **Context injection** — the current song (title, artist, key, BPM, chord sheet) and setlist are folded into the system prompt, with the chord sheet truncated at 3 000 characters to bound prompt cost.

### Observability

- **Sentry** initialized before any other import (required for correct instrumentation), with environment-aware trace sampling — 10 % in production, 100 % locally.
- **Structured JSON logging** (`src/utils/logger.ts`) with Morgan piped through the same stream, so HTTP access logs and application logs share one format.
- **`GET /api/health`** pings both databases via `Promise.allSettled` and returns `200 ok` or `503 degraded` with per-dependency status, uptime, and response time — wired for App Engine health checks.

---

## API surface

All routes are mounted under `/api`. Responses are wrapped consistently:

```json
{ "error": false, "status": 200, "body": <data> }
```

<details>
<summary><b>Songs</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/songs` | conditional | List songs (public, or user's own with `?userId=`) |
| `POST` | `/api/songs` | required | Create a song (Zod-validated) |
| `GET` | `/api/songs/:id` | — | Get song by id |
| `PUT` | `/api/songs/:id` | required | Update a song |
| `GET` | `/api/songs/user/:id` | conditional | Songs belonging to a user |
| `GET` | `/api/songs/artist/:artist` | — | Songs by artist |
| `POST` | `/api/songs/:id/collaborators` | required | Share a song |
| `DELETE` | `/api/songs/:id/collaborators/:uid` | required | Revoke access |
| `GET` | `/api/songs/:id/notes` | required | List practice notes |
| `POST` | `/api/songs/:id/notes` | required | Create a note |
| `PATCH` | `/api/songs/:id/notes/:noteId` | required | Update a note |
| `DELETE` | `/api/songs/:id/notes/:noteId` | required | Delete a note |

</details>

<details>
<summary><b>Setlists</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/setlists` | conditional | List setlists |
| `POST` | `/api/setlists` | required | Create a setlist |
| `GET` | `/api/setlists/:id` | — | Get setlist by id |
| `POST` | `/api/setlists/:id/songs` | required | Add songs to a setlist |
| `POST` | `/api/setlists/:id/collaborators` | required | Share a setlist |
| `DELETE` | `/api/setlists/:id/collaborators/:uid` | required | Revoke access |

</details>

<details>
<summary><b>Bands, Users, Artists, AI, Health</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/bands` | required | Create a band |
| `GET` | `/api/bands` | conditional | List bands |
| `GET` | `/api/bands/:id` | — | Get band by id |
| `PUT` | `/api/bands/:id` | required | Update a band |
| `POST` | `/api/bands/:id/members` | conditional | Add a member |
| `DELETE` | `/api/bands/:id/members/:uid` | conditional | Remove a member |
| `GET` | `/api/users/lookup` | required | Look up a user by email |
| `GET` | `/api/users/:uid` | required | Public user info |
| `GET` | `/api/users/:uid/profile` | required | Get profile |
| `PUT` | `/api/users/:uid/profile` | required | Update profile |
| `GET` | `/api/users/:uid/practice` | required | Practice streak data |
| `POST` | `/api/users/:uid/practice` | required | Record a practice session |
| `GET` | `/api/artists` | — | List artists |
| `POST` | `/api/artists` | — | Upsert an artist |
| `POST` | `/api/ai/chat` | required | **Streaming** musical assistant |
| `GET` | `/api/health` | — | Dependency health check |

</details>

Interactive **Swagger UI** is generated from JSDoc annotations on every route and served at `/api-docs` — development only, since exposing a live schema browser in production widens the attack surface for no user benefit.

**Artist sync:** `upsertSong` and `patchSong` detect an `artist` field and call `artistsController.upsertArtist` transparently, so the artists collection stays consistent without the client making a second round trip.

---

## Getting started

**Prerequisites:** Node.js 22+ (native TypeScript execution), Yarn, a MongoDB Atlas URI, and Google Application Default Credentials for Firestore.

```bash
yarn install
touch .env.dev    # populate with the variables listed below
yarn dev          # http://localhost:3001 · docs at /api-docs
```

### Environment variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GOOGLE_CLOUD_PROJECT` | Firebase / GCP project id |
| `FIRESTORE_DATABASE_ID` | Firestore database id (defaults to `(default)`) |
| `CORS_WHITELIST` | Comma-separated origins; `*` matches one subdomain segment |
| `PORT` | Server port (defaults to `3001`) |
| `GEMINI_API_KEY` | Google AI Studio key — direct Gemini access |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key — used for Anthropic |
| `AI_CHAT_MODEL` | Default Gemini model (defaults to `gemini-2.5-flash`) |
| `AI_CHAT_MODEL_ANTHROPIC` | Gateway model for `provider: "anthropic"` |
| `SENTRY_DSN` | Sentry project DSN (production only) |

> The CORS whitelist treats `*` as a single-segment glob, so `https://bandmate*.vercel.app` covers every Vercel branch preview without opening the door to `evil.bandmate.attacker.app`. Regex metacharacters in the pattern are escaped before the glob is expanded.

### Scripts

```bash
yarn dev      # watch mode, loads .env.dev
yarn start    # production start
yarn test     # jest — 97 tests across 7 suites
yarn lint     # eslint (--fix to autofix)
yarn deploy   # gcloud app deploy
```

---

## Testing

```
Test Suites: 7 passed, 7 total
Tests:       97 passed, 97 total
Time:        ~1.4s
```

Every domain ships a `tests/mockStore.ts` implementing the same `Store<T>` interface as the real backend. Because controllers receive their store by injection, the suite covers ownership rules, collaborator permission edges, artist-sync side effects, and validation failures — with no emulator, no containers, and no network. The cache's TTL expiry and prefix invalidation are tested directly.

The whole suite runs in under two seconds, which is the point: a test suite fast enough to run on every save is a test suite that actually gets run.

---

## CI/CD

Two chained GitHub Actions workflows:

1. **`node.js.yml`** — on every push and PR to `main`: install with `--frozen-lockfile`, run tests, run lint, on Node 22.
2. **`deploy.yml`** — triggered by `workflow_run` completion, explicitly re-checks `conclusion == 'success'` before authenticating to GCP and running `gcloud app deploy`.

The second workflow guards its own precondition rather than trusting the trigger, because `workflow_run` fires on *completion* — including failure. Without that check, a red build would deploy itself.

---

## Related packages

This API is one third of the Bandmate system:

| Package | Stack | Role |
|---|---|---|
| `bandmate-front` | Vue 3 + Pinia, PWA | Chord sheets, setlists, offline-capable player |
| **`bandmate-api`** | TypeScript + Express 5 | **This repository** |
| `bandmate-mcp` | TypeScript | MCP server exposing the API as tools to Claude |

---

## License

ISC

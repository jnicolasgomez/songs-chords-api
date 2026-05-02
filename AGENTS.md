# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Run with file watching (uses .env)
yarn start        # Run without watching
yarn test         # Run all tests
yarn test -- --testPathPattern=songs  # Run a single test file
yarn lint         # ESLint
```

## Architecture

Express 5 REST API written in TypeScript, running on Node.js 22+ with native TypeScript support (no build step, no transpilation). The project uses ESM (`"type": "module"`), so all local imports must include the `.ts` extension.

All routes are mounted under `/api`. Swagger UI is available at `/api-docs`.

### Dual-database design

Songs and artists are stored in **Firestore**; lists are stored in **MongoDB**. The two stores expose the same `Store<T>` interface (`src/songs/types/types.ts`), but their query signatures differ:

- **Firestore** (`src/store/firestore.ts`): `query(table, [[field, op, value], ...])` — tuple array conditions
- **MongoDB** (`src/store/mongoStore.ts`): `query(table, mongoFilterObject)` — native MongoDB filter

### Controller / store dependency injection

Each domain (`songs`, `lists`, `artists`) follows this pattern:

- `controller.ts` — exports a factory function `(store?) => { methods }`. When no store is passed, it falls back to the real store. This enables unit testing by injecting mock stores.
- `index.ts` — instantiates the controller with the real store and re-exports it as a singleton.
- `routes.ts` — imports from `index.ts` and wires HTTP handlers.

When `upsertSong` or `patchSong` is called with an `artist` field, it automatically calls `artistsController.upsertArtist` to keep the artists collection in sync.

### Authentication

`src/middleware/session.ts` validates Firebase ID tokens (Bearer JWT via Firebase Admin SDK). The middleware only enforces auth when a `userId` query param or route `:id` param is present — requests without those params skip the check entirely.

### Response shape

All responses go through `src/network/response.ts` and are wrapped as:
```json
{ "error": false, "status": 200, "body": <data> }
```

## Environment variables

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `GOOGLE_CLOUD_PROJECT` | Firebase/GCP project ID |
| `FIRESTORE_DATABASE_ID` | Firestore database ID (defaults to `(default)`) |
| `CORS_WHITELIST` | Comma-separated allowed origins |
| `PORT` | Server port (defaults to `3001`) |

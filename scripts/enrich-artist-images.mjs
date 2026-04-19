/**
 * One-time enrichment script: fetches artist images from Deezer and stores them in Firestore via the API.
 *
 * Usage:
 *   node scripts/enrich-artist-images.mjs
 *
 * Optional env vars:
 *   BANDMATE_API  — base URL of the running API (default: http://localhost:3001)
 */

const API_URL = process.env.BANDMATE_API ?? 'http://localhost:3001';
const DELAY_MS = 250; // be polite to Deezer

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDeezerImage(artistName) {
  const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistName)}&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const picture = data.data?.[0]?.picture_medium;
    // Deezer returns a placeholder for unknown artists — skip it
    if (!picture || picture.includes('artist/no-artist')) return null;
    return picture;
  } catch {
    return null;
  }
}

async function main() {
  // 1. Fetch all artists from the API
  const res = await fetch(`${API_URL}/api/artists`);
  if (!res.ok) throw new Error(`Failed to fetch artists: ${res.status}`);
  const { body: artists } = await res.json();
  console.log(`Found ${artists.length} artists. Enriching...\n`);

  let updated = 0;
  let skipped = 0;

  for (const artist of artists) {
    if (artist.imageUrl) {
      console.log(`  skip  ${artist.name} (already has image)`);
      skipped++;
      continue;
    }

    const imageUrl = await fetchDeezerImage(artist.name);

    if (imageUrl) {
      const upsertRes = await fetch(`${API_URL}/api/artists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: artist.name, imageUrl }),
      });
      if (upsertRes.ok) {
        console.log(`  ✓  ${artist.name}`);
        console.log(`     ${imageUrl}`);
        updated++;
      } else {
        console.log(`  ✗  ${artist.name} — upsert failed (${upsertRes.status})`);
      }
    } else {
      console.log(`  –  ${artist.name} — not found on Deezer`);
      skipped++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped/not found: ${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

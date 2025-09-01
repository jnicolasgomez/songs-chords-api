# Field Projection for Database Efficiency

This document explains how to use the new field projection functionality to make your database reads more efficient when you only need specific fields.

## What is Field Projection?

Field projection allows you to retrieve only the specific fields you need from a document, instead of the entire document. This reduces:
- Network transfer time
- Memory usage
- Processing time

## New API Endpoints

### 1. Lightweight Song Titles by List
```
GET /songs/list/:id/titles
```
Returns only `id` and `title` fields for songs in a list.

**Example Response:**
```json
[
  { "id": "song1", "title": "Wonderwall" },
  { "id": "song2", "title": "Hotel California" }
]
```

### 2. Lightweight Song Titles by IDs
```
GET /songs/titles?ids=song1,song2,song3
```
Returns only `id` and `title` fields for specific songs.

### 3. Existing Endpoints with Lightweight Option
```
GET /songs?ids=song1,song2&lightweight=true
GET /songs/list/:id?lightweight=true
```
Add `lightweight=true` to existing endpoints to get only title and id fields.

## Controller Methods

### New Lightweight Methods

```typescript
// Get only title and id for songs by IDs
getSongTitlesByIds(idArray: string[]): Promise<{id: string, title: string}[]>

// Get only title and id for songs in a list
getSongTitlesByList(id: string): Promise<{id: string, title: string}[]>
```

### Updated Methods with Field Projection

```typescript
// Get songs by IDs with optional field projection
getSongsByIds(idArray: string[], fields?: string[]): Promise<Song[]>

// Get song by ID with optional field projection
getSongById(id: string, fields?: string[]): Promise<Song>
```

## Store Interface Updates

The `Store` interface now supports field projection:

```typescript
interface Store {
  byIdsArray: (table: string, ids: string[], fields?: string[]) => Promise<Song[]>;
  get: (table: string, id: string, fields?: string[]) => Promise<Song | null>;
  // ... other methods
}
```

## Usage Examples

### In Your Controller
```typescript
// Get only title and id fields
const songTitles = await songsController.getSongTitlesByList('list123');

// Get specific fields
const songsWithDetails = await songsController.getSongsByIds(['1', '2'], ['title', 'id', 'tags']);
```

### In Your Routes
```typescript
// Use lightweight endpoint for better performance
app.get('/songs/list/:id/titles', async (req, res) => {
  const titles = await songsController.getSongTitlesByList(req.params.id);
  res.json(titles);
});
```

## Performance Benefits

- **Before**: Retrieving full song documents with all fields
- **After**: Retrieving only `id` and `title` fields

**Example Song Document:**
```json
{
  "id": "song1",
  "title": "Wonderwall",
  "chords-text": "Very long chord progression...",
  "details": { "bpm": 120, "key": "C" },
  "tags": ["rock", "90s"],
  "spotifyUrl": "https://...",
  "youtubeUrl": "https://...",
  "public": true,
  "user_id": "user123"
}
```

**With Field Projection:**
```json
{
  "id": "song1",
  "title": "Wonderwall"
}
```

This can reduce data transfer by **70-80%** for typical song documents.

## Implementation Details

The field projection is implemented using Firestore's `select()` method:

```typescript
// In firestore.ts
if (fields && fields.length > 0) {
  queryRef = queryRef.select(...fields);
}
```

## Best Practices

1. **Use lightweight endpoints** when you only need basic information
2. **Specify exact fields** when you need specific data
3. **Cache frequently accessed lists** to avoid repeated database calls
4. **Consider pagination** for large lists to further improve performance

## Migration Guide

Existing code will continue to work unchanged. To take advantage of field projection:

1. **Replace** `getSongByList(id)` with `getSongTitlesByList(id)` when you only need titles
2. **Add** `lightweight=true` query parameter to existing endpoints
3. **Use** new dedicated endpoints for better performance
4. **Update** your frontend to handle the reduced data structure

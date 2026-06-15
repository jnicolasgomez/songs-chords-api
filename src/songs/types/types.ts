import { z } from "zod";

export const SONG_NOTE_ICONS = [
  "mdi-lightbulb",
  "mdi-alert",
  "mdi-music-note",
  "mdi-pencil",
  "mdi-star",
  "mdi-bookmark",
  "mdi-comment",
  "mdi-headphones",
  "mdi-piano",
  "mdi-microphone",
  "mdi-metronome",
  "mdi-information",
] as const;

export const SongNoteSchema = z.object({
  id: z.string().optional(),
  songId: z.string().optional(),
  userId: z.string().optional(),
  icon: z.enum(SONG_NOTE_ICONS),
  title: z.string().min(1).max(80),
  text: z.string().max(4000),
  hidden: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export const SongNoteCreateSchema = z.object({
  icon: z.enum(SONG_NOTE_ICONS),
  title: z.string().min(1).max(80),
  text: z.string().max(4000).optional(),
  hidden: z.boolean().optional(),
});

export const SongNotePatchSchema = z.object({
  icon: z.enum(SONG_NOTE_ICONS).optional(),
  title: z.string().min(1).max(80).optional(),
  text: z.string().max(4000).optional(),
  hidden: z.boolean().optional(),
});

export type SongNote = z.infer<typeof SongNoteSchema>;
export type SongNoteCreate = z.infer<typeof SongNoteCreateSchema>;
export type SongNotePatch = z.infer<typeof SongNotePatchSchema>;

export const SongDetailsSchema = z.object({
  bpm: z.number().optional(),
  key: z.string().optional(),
  voice: z.string().optional(),
  keyboardBank: z.string().optional(),
  tone: z.string().optional(),
  duration: z.string().optional(),
  capo: z.number().optional(),
});

export const SongSchema = z.object({
  id: z.string().optional(),
  user_uid: z.string().optional(),
  public: z.boolean().optional(),
  title: z.string(),
  artist: z.string().optional(),
  /** @deprecated Use `chordpro` instead */
  "chords-text": z.string().optional(),
  chordpro: z.string().optional(),
  details: SongDetailsSchema.optional(),
  tags: z.array(z.string()).optional(),
  spotifyUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  soundcloudUrl: z.string().optional(),
  band_id: z.string().optional(),
  shared_with: z.array(z.string()).optional(),
}).passthrough();

export type SongDetails = z.infer<typeof SongDetailsSchema>;
export type Song = z.infer<typeof SongSchema>;

export interface Store<T = any> {
  byUserId: (table: string, userId: string) => Promise<T[]>;
  listPublic: (table: string, fields?: string[]) => Promise<T[]>;
  get: (table: string, id: string, fields?: string[]) => Promise<T | null>;
  byIdsArray: (table: string, ids: string[], fields?: string[]) => Promise<T[]>;
  upsert: (table: string, data: any) => Promise<{ id: string }>;
  list: (table: string, fields?: string[]) => Promise<T[]>;
  query: (table: string, query: any) => Promise<T[]>;
  sharedWithUser: (table: string, userId: string) => Promise<T[]>;
}

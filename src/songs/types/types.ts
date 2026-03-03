import { z } from "zod";

export const SongDetailsSchema = z.object({
  bpm: z.number().optional(),
  key: z.string().optional(),
  voice: z.string().optional(),
});

export const SongSchema = z.object({
  id: z.string().optional(),
  public: z.boolean().optional(),
  title: z.string(),
  artist: z.string().optional(),
  "chords-text": z.string(),
  details: SongDetailsSchema.optional(),
  tags: z.array(z.string()).optional(),
  spotifyUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
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
}

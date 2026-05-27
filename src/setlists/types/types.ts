import { z } from "zod";

const SongItemSchema = z.object({
  type: z.literal("song"),
  songId: z.string(),
});

const SetItemSchema = z.object({
  type: z.literal("set"),
  label: z.string(),
});

const PauseItemSchema = z.object({
  type: z.literal("pause"),
  minutes: z.number(),
  label: z.string().optional(),
});

export const SetlistItemSchema = z.discriminatedUnion("type", [
  SongItemSchema,
  SetItemSchema,
  PauseItemSchema,
]);

export type SetlistItem = z.infer<typeof SetlistItemSchema>;

export const SetlistSchema = z.looseObject({
  id: z.string(),
  title: z.string(),
  user_uid: z.string(),
  private: z.boolean(),
  songs: z.array(z.string()).optional(),
  items: z.array(SetlistItemSchema).optional(),
  band_id: z.string().optional(),
  shared_with: z.array(z.string()).optional(),
  show_date: z.string().optional(),
  pinned: z.boolean().optional(),
});

export type Setlist = z.infer<typeof SetlistSchema>;

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

export const ListItemSchema = z.discriminatedUnion("type", [
  SongItemSchema,
  SetItemSchema,
  PauseItemSchema,
]);

export type ListItem = z.infer<typeof ListItemSchema>;

export const ListSchema = z.looseObject({
  id: z.string().optional(),
  title: z.string(),
  user_uid: z.string().optional(),
  private: z.boolean(),
  songs: z.array(z.string()).optional(),
  items: z.array(ListItemSchema).optional(),
  band_id: z.string().optional(),
  shared_with: z.array(z.string()).optional(),
  show_date: z.string().optional(),
  pinned: z.boolean().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  updatedBy: z.string().optional(),
});

export type List = z.infer<typeof ListSchema>;

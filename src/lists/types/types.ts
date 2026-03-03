import { z } from "zod";

export const ListSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  user_uid: z.string(),
  private: z.boolean(),
  songs: z.array(z.string()).optional(),
}).passthrough();

export type List = z.infer<typeof ListSchema>;

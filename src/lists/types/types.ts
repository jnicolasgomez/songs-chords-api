import { z } from "zod";

export const ListSchema = z.looseObject({
  id: z.string().optional(),
  title: z.string(),
  user_uid: z.string(),
  private: z.boolean(),
  songs: z.array(z.string()).optional(),
  band_id: z.string().optional(),
  shared_with: z.array(z.string()).optional(),
});

export type List = z.infer<typeof ListSchema>;

import { z } from "zod";

export const BandSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created_by: z.string(),
  members: z.array(z.string()).default([]),
  created_at: z.string().optional(),
});

export type Band = z.infer<typeof BandSchema>;

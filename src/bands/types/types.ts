import { z } from "zod";

export const BandSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  created_by: z.string(),
  members: z.array(z.string()).default([]),
  created_at: z.string().optional(),
  image_url: z.string().url().optional(),
});

export const CreateBandRequestSchema = z.object({
  name: z.string().min(1),
  members: z.array(z.string()).optional(),
  image_url: z.string().url().optional(),
});

export type Band = z.infer<typeof BandSchema>;

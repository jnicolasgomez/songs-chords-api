import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const AiChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(20),
  provider: z.enum(["anthropic", "gemini"]).default("gemini"),
  songContext: z
    .object({
      title: z.string().nullish(),
      artist: z.string().nullish(),
      chordsText: z.string().nullish(),
      tone: z.string().nullish(),
      bpm: z.coerce.number().nullish(),
    })
    .optional(),
  listContext: z
    .object({
      title: z.string().nullish(),
      songs: z
        .array(
          z.object({
            title: z.string().nullish(),
            artist: z.string().nullish(),
            tone: z.string().nullish(),
            bpm: z.coerce.number().nullish(),
          })
        )
        .optional(),
    })
    .optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;
export type AiChatResponse = { reply: string };

export const AiSongDetailsRequestSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
});

export type AiSongDetailsRequest = z.infer<typeof AiSongDetailsRequestSchema>;

export type AiSongDetailsResponse = {
  found: boolean;
  tone?: string;
  bpm?: number;
  duration?: string;
};

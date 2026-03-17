import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AiChatRequest, AiChatResponse } from "../types/types.ts";

export default function () {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  function buildSystemPrompt(songContext?: AiChatRequest["songContext"]): string {
    let system = `Eres Bandmate AI, un asistente musical experto especializado en teoría musical, acordes y composición.
Responde siempre en español de manera concisa y práctica.
Cuando sugieras acordes, usa notación estándar (ej: Am, G, Cmaj7, F#m).
Cuando analices letras, enfócate en métrica, rima, estructura y emoción.
Cuando respondas preguntas de teoría, adapta la complejidad al contexto de la canción si está disponible.`;

    if (songContext) {
      const { title, artist, tone, bpm, chordsText } = songContext;
      const parts: string[] = [];
      if (title) parts.push(`Título: ${title}`);
      if (artist) parts.push(`Artista: ${artist}`);
      if (tone) parts.push(`Tono: ${tone}`);
      if (bpm) parts.push(`BPM: ${bpm}`);

      if (parts.length > 0) {
        system += `\n\n## Canción actual en pantalla\n${parts.join(" | ")}`;
      }

      if (chordsText) {
        const truncated =
          chordsText.length > 3000
            ? chordsText.slice(0, 3000) + "\n...[truncado]"
            : chordsText;
        system += `\n\n## Cifrado / Letra:\n${truncated}`;
      }
    }

    return system;
  }

  async function chatWithAnthropic(body: AiChatRequest): Promise<AiChatResponse> {
    const systemPrompt = buildSystemPrompt(body.songContext);
    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages,
    });
    const reply = (message.content[0] as { type: "text"; text: string }).text;
    return { reply };
  }

  async function chatWithGemini(body: AiChatRequest): Promise<AiChatResponse> {
    const systemPrompt = buildSystemPrompt(body.songContext);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemPrompt,
    });

    const allMessages = body.messages;
    const history = allMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });
    const lastMessage = allMessages[allMessages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return { reply: result.response.text() };
  }

  async function chat(body: AiChatRequest): Promise<AiChatResponse> {
    if (body.provider === "gemini") {
      return chatWithGemini(body);
    }
    return chatWithAnthropic(body);
  }

  return { chat };
}

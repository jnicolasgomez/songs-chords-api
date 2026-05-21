import { streamText } from "ai";
import type { AiChatRequest } from "../types/types.ts";

const DEFAULT_GEMINI = process.env.AI_CHAT_MODEL || "google/gemini-2.5-flash";
const DEFAULT_ANTHROPIC =
  process.env.AI_CHAT_MODEL_ANTHROPIC || "anthropic/claude-haiku-4.5";

export default function () {
  function buildSystemPrompt(body: AiChatRequest): string {
    let system = `Eres Bandmate AI, un asistente musical experto especializado en teoría musical, acordes y composición.
Responde siempre en español de manera amable, concisa y práctica.
Cuando sugieras acordes, usa notación estándar (ej: Am, G, Cmaj7, F#m).
Cuando analices letras, enfócate en métrica, rima, estructura y emoción.
Cuando respondas preguntas de teoría, adapta la complejidad al contexto de la canción si está disponible.
Puedes usar markdown (encabezados, listas, **negritas**, *cursivas*, enlaces) para estructurar tus respuestas.
Cuando devuelvas cifrado o letras con acordes, envuélvelo SIEMPRE en un bloque de código con triple backtick para preservar el espaciado exacto.
Cuando sugieras acordes, considera el tono y el tempo de la canción si está disponible,
mantén toda la letra original y devuelve la respuesta con este formato estricto:
una línea de acordes arriba y una línea de letra abajo, sin líneas en blanco entre ellas,
colocando cada acorde exactamente sobre la sílaba correspondiente, sin paréntesis y sin separar las palabras.
Por ejemplo:
\`\`\`
[Verso]
G           Cadd9
Un olor a tabaco y channel,
Em              D
me recuerda el olor de su piel.
\`\`\``;

    const { songContext, listContext } = body;

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

    if (listContext) {
      system += `\n\n## Setlist actual\nTítulo: ${listContext.title || "Sin título"}`;
      if (listContext.songs && listContext.songs.length > 0) {
        system += `\n\n## Canciones en el setlist (${listContext.songs.length}):\n`;
        listContext.songs.forEach((s, i) => {
          const parts: string[] = [`${i + 1}. ${s.title || "Sin título"}`];
          if (s.artist) parts.push(`Artista: ${s.artist}`);
          if (s.tone) parts.push(`Tono: ${s.tone}`);
          if (s.bpm) parts.push(`BPM: ${s.bpm}`);
          system += parts.join(" | ") + "\n";
        });
      }
    }

    return system;
  }

  function chat(body: AiChatRequest, signal?: AbortSignal) {
    const model =
      body.provider === "anthropic" ? DEFAULT_ANTHROPIC : DEFAULT_GEMINI;

    return streamText({
      model,
      system: buildSystemPrompt(body),
      messages: body.messages,
      abortSignal: signal,
    });
  }

  return { chat };
}

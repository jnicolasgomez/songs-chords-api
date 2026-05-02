import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type {
  AiChatRequest,
  AiChatResponse,
  AiSongDetailsRequest,
  AiSongDetailsResponse,
} from "../types/types.ts";

const TONE_VALUES = [
  "C", "Cm", "C#", "C#m", "D", "Dm", "Eb", "Ebm",
  "E", "Em", "F", "Fm", "F#", "F#m", "G", "Gm",
  "G#", "G#m", "A", "Am", "Bb", "Bbm", "B", "Bm",
];

export default function () {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  function buildSystemPrompt(body: AiChatRequest): string {
    let system = `Eres Bandmate AI, un asistente musical experto especializado en teoría musical, acordes y composición.
Responde siempre en español de manera concisa y práctica.
Cuando sugieras acordes, usa notación estándar (ej: Am, G, Cmaj7, F#m).
Cuando analices letras, enfócate en métrica, rima, estructura y emoción.
Cuando respondas preguntas de teoría, adapta la complejidad al contexto de la canción si está disponible.
Cuando sugieras acordes, considera el tono y el tempo de la canción si está disponible,
mantén toda la letra original y devuelve la respuesta con este formato estricto:
una línea de acordes arriba y una línea de letra abajo, sin líneas en blanco entre ellas,
colocando cada acorde exactamente sobre la sílaba correspondiente, sin paréntesis y sin separar las palabras.
Por ejemplo:
  [Verso]
  G           Cadd9
  Un olor a tabaco y channel, 
  Em              D
  me recuerda el olor de su piel.`;

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

  async function chatWithAnthropic(body: AiChatRequest): Promise<AiChatResponse> {
    const systemPrompt = buildSystemPrompt(body);
    const message = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages,
    });
    const reply = (message.content[0] as { type: "text"; text: string }).text;
    return { reply };
  }

  async function chatWithGemini(body: AiChatRequest): Promise<AiChatResponse> {
    const systemPrompt = buildSystemPrompt(body);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
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

  async function getSongDetails(
    body: AiSongDetailsRequest
  ): Promise<AiSongDetailsResponse> {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      systemInstruction: `Eres una base de datos musical. Recibirás el título y artista de una canción y devolverás sus metadatos en JSON.
Reglas estrictas:
- Si NO conoces la canción con certeza, responde {"found": false}. No adivines nunca.
- Si la conoces, responde {"found": true, "tone": "<tono>", "bpm": <entero>, "duration": "<m:ss>"}.
- "tone" debe ser uno de: ${TONE_VALUES.join(", ")}. Usa el tono original de la grabación.
- "bpm" es un entero (tempo de la grabación original).
- "duration" es texto en formato m:ss o mm:ss (ej: "3:45", "10:02").
- Omite los campos que no conozcas con certeza, pero mantén "found": true si reconoces la canción.`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            found: { type: SchemaType.BOOLEAN },
            tone: { type: SchemaType.STRING, enum: TONE_VALUES, nullable: true },
            bpm: { type: SchemaType.INTEGER, nullable: true },
            duration: { type: SchemaType.STRING, nullable: true },
          },
          required: ["found"],
        },
      },
    });

    const prompt = `Título: ${body.title}\nArtista: ${body.artist}`;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text) as AiSongDetailsResponse;
      if (!parsed.found) return { found: false };
      const out: AiSongDetailsResponse = { found: true };
      if (parsed.tone) out.tone = parsed.tone;
      if (typeof parsed.bpm === "number" && parsed.bpm > 0) out.bpm = parsed.bpm;
      if (parsed.duration && /^\d{1,2}:\d{2}$/.test(parsed.duration)) {
        out.duration = parsed.duration;
      }
      return out;
    } catch {
      return { found: false };
    }
  }

  return { chat, getSongDetails };
}

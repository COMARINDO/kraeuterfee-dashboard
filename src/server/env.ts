import { z } from "zod";

const EnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    /**
     * Prisma-Schema; Login & Session laufen aktuell ohne DB.
     * Auf Vercel war DATABASE_URL oft nicht gesetzt — dann schlug jede /app-Route
     * bei env.parse fehl. Fallback wie in .env.example.
     */
    DATABASE_URL: z.preprocess(
      (v) => (v === "" || v === undefined ? "file:./dev.db" : v),
      z.string().min(1),
    ),
    SESSION_PASSWORD: z.string().min(16),
    /** Login identifier (e.g. "Martha"). If unset, APP_ADMIN_EMAIL is used. */
    APP_ADMIN_USERNAME: z.string().min(1).optional(),
    APP_ADMIN_EMAIL: z.string().email(),
    APP_ADMIN_PASSWORD: z.string().min(1),
    /** OpenAI API key for /api/generate-plant-post (server only). */
    OPENAI_API_KEY: z.string().optional(),
    /**
     * OpenAI-kompatible Chat-API (z. B. Ollama: http://ollama:11434/v1).
     * Bildgenerierung: nur wenn OPENAI_IMAGE_GENERATION=on und ohne diese URL, oder echtes OpenAI.
     */
    OPENAI_BASE_URL: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : String(v).trim()),
      z.string().url().optional(),
    ),
    /** Chat-Modell (OpenAI: gpt-4o-mini; Ollama: z. B. llama3.2, qwen2.5). */
    OPENAI_CHAT_MODEL: z.preprocess(
      (v) => (v === "" || v === undefined || v === null ? undefined : String(v).trim()),
      z.string().min(1).optional(),
    ),
    /**
     * OpenAI Images API (DALL·E / gpt-image). Bei Ollama: `off` oder `auto` (auto = aus, sobald OPENAI_BASE_URL gesetzt).
     */
    OPENAI_IMAGE_GENERATION: z.preprocess((v) => {
      if (v === "" || v === undefined || v === null) return "auto";
      const s = String(v).trim().toLowerCase();
      if (s === "1" || s === "true" || s === "on" || s === "yes") return "on";
      if (s === "0" || s === "false" || s === "off" || s === "no") return "off";
      return "auto";
    }, z.enum(["auto", "on", "off"])),
    /**
     * Optional: Base64 des Kräuterfee-Maskottchens (roh oder data:image/…;base64,…)
     * für Bildgenerierung mit Referenz, falls keine Datei unter public/ liegt.
     */
    KRAEUTERFEE_MASCOT_BASE64: z.string().optional(),
    /** OpenWeather API key for weather-aware generation (optional). */
    OPENWEATHER_API_KEY: z.string().optional(),
    META_APP_ID: z.string().optional(),
    META_APP_SECRET: z.string().optional(),
    /** Trim + ohne Slash am Ende — Meta ist bei OAuth strikt (Redirect muss überall identisch sein). */
    META_REDIRECT_URI: z.preprocess(
      (v) => {
        if (v === undefined || v === null || v === "") return undefined;
        let s = String(v).trim();
        while (s.endsWith("/")) s = s.slice(0, -1);
        return s || undefined;
      },
      z.string().url().optional(),
    ),
    /** Wenn gesetzt: nur diese Seite ID aus /me/accounts zum Posten (sonst erste Seite). */
    META_PAGE_ID: z.string().min(1).optional(),
    /**
     * Vercel Cron: Authorization Bearer … für GET /api/cron/publish-scheduled
     * In Vercel Projekt als Umgebungsvariable anlegen.
     */
    CRON_SECRET: z.string().min(8).optional(),
})
  .superRefine((data, ctx) => {
    if (process.env.NODE_ENV !== "production") return;
    if (process.env.KRAEUTERFEE_RUNTIME !== "docker") return;
    const u = data.DATABASE_URL;
    if (u.startsWith("file:") && !u.startsWith("file:/")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message:
          "Docker production: use an absolute SQLite path (e.g. file:/data/kraeuterfee.db) with a persistent volume.",
      });
    }
  });

export const env = EnvSchema.parse(process.env);

/** true = DALL·E / gpt-image Aufrufe erlaubt (nur echte OpenAI-Images-API). */
export function useOpenAiImageApi(): boolean {
  const mode = env.OPENAI_IMAGE_GENERATION;
  if (mode === "off") return false;
  if (mode === "on") return true;
  return !env.OPENAI_BASE_URL;
}
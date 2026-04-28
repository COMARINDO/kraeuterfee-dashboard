import { z } from "zod";

const EnvSchema = z.object({
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
  APP_ADMIN_EMAIL: z.string().email(),
  APP_ADMIN_PASSWORD: z.string().min(8),
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
  /** OpenAI API key for /api/generate-plant-post (server only). */
  OPENAI_API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);


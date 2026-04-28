import { env } from "@/server/env";
import { NextResponse } from "next/server";

/**
 * Öffentlicher Abgleich: welche Redirect-URI der Server wirklich nutzt (ohne Secrets).
 * Bei „Domain nicht in App“ Meta vs Vercel Zeichen für Zeichen vergleichen.
 */
export async function GET() {
  const uri = env.META_REDIRECT_URI ?? null;
  let hostname: string | null = null;
  try {
    if (uri) hostname = new URL(uri).hostname;
  } catch {
    hostname = null;
  }

  return NextResponse.json({
    metaAppId: env.META_APP_ID ?? null,
    redirectUri: uri,
    redirectHostname: hostname,
    checklist: [
      "Meta → App einstellen → Basis → App-Domains: nur redirectHostname (ohne https)",
      "Meta → Facebook Login → Einstellungen → Gültige OAuth-Weiterleitungs-URIs: exakt redirectUri",
      "Nach Änderungen in Meta immer speichern und 1–2 Minuten warten",
    ],
  });
}

import { env } from "@/server/env";
import { META_GRAPH_API_VERSION } from "@/server/meta-graph";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Standard-Login ohne App Review: nur Default-Berechtigungen.
 * Erweiterte Facebook-Berechtigungen (z. B. pages_*) brauchen App Review und sind
 * für die Entwicklung hier deaktiviert.
 * Facebook OAuth expects space-separated scopes (NOT comma-separated).
 */
const SCOPES = ["email", "public_profile"].join(" ");

export async function GET() {
  if (!env.META_APP_ID || !env.META_REDIRECT_URI) {
    return NextResponse.json(
      {
        error: "Facebook Connect ist noch nicht konfiguriert.",
        missing: ["META_APP_ID", "META_REDIRECT_URI"].filter((key) => !process.env[key]),
        nextStep:
          "Lege eine Meta Developer App an und setze META_APP_ID, META_APP_SECRET und META_REDIRECT_URI in Vercel.",
      },
      { status: 503 },
    );
  }

  const state = crypto.randomBytes(16).toString("hex");
  const session = await getSession(cookies());
  session.metaOauthState = state;
  await session.save();

  const url = new URL(`https://www.facebook.com/${META_GRAPH_API_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}


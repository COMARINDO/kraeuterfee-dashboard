import { env } from "@/server/env";
import { META_GRAPH_API_VERSION } from "@/server/meta-graph";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Facebook OAuth: scope ist space-getrennt (Kommas sind falsch und führen zu kaputten Requests).
 *
 * `email` nur anfordern, wenn es im Meta-Dashboard unter dem Use-Case
 * „Authenticate and request data from users with Facebook Login“ (bzw. DE: Anmeldedaten)
 * explizit hinzugefügt ist – sonst: „Invalid Scopes: email“.
 * Produkt: klassisches „Facebook Login“ nutzen; „Facebook Login for Business“ verfolgt andere Scopes.
 *
 * Page-Publishing: pages_show_list (/me/accounts), pages_manage_posts – für Live-Nutzer ggf. App Review.
 */
const SCOPES = ["public_profile", "pages_show_list", "pages_manage_posts"].join(" ");

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

  // Runtime debug: helps verify which app id is used on Vercel.
  console.log("[meta-oauth] start", {
    metaAppId: env.META_APP_ID,
    redirectUri: env.META_REDIRECT_URI,
    graphVersion: META_GRAPH_API_VERSION,
  });

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


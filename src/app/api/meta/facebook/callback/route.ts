import { env } from "@/server/env";
import { exchangeForLongLivedUserToken } from "@/server/facebook-long-lived";
import { META_GRAPH_API_VERSION } from "@/server/meta-graph";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const MANUAL = "/app/posts/manual";

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
};

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const session = await getSession(cookies());

  if (session.metaOauthState) {
    if (!state || state !== session.metaOauthState) {
      return NextResponse.redirect(new URL(`${MANUAL}?facebook=state-mismatch`, requestUrl));
    }
  }
  session.metaOauthState = undefined;
  await session.save().catch(() => {});

  if (!code) {
    return NextResponse.redirect(new URL(`${MANUAL}?facebook=cancelled`, requestUrl));
  }

  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI) {
    return NextResponse.redirect(new URL(`${MANUAL}?facebook=config-missing`, requestUrl));
  }

  const tokenUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", env.META_APP_ID);
  tokenUrl.searchParams.set("client_secret", env.META_APP_SECRET);
  tokenUrl.searchParams.set("redirect_uri", env.META_REDIRECT_URI);
  tokenUrl.searchParams.set("code", code);

  const res = await fetch(tokenUrl);
  const data = (await res.json()) as TokenResponse;

  if (!res.ok || !data.access_token) {
    const message = encodeURIComponent(data.error?.message ?? "token-error");
    return NextResponse.redirect(new URL(`${MANUAL}?facebook=${message}`, requestUrl));
  }

  const longLived = await exchangeForLongLivedUserToken(data.access_token);
  const token = longLived?.access_token ?? data.access_token;
  const expiresIn = longLived?.expires_in ?? data.expires_in;

  session.facebook = {
    connectedAt: new Date().toISOString(),
    accessToken: token,
    tokenType: data.token_type,
    expiresIn,
  };
  await session.save();

  return NextResponse.redirect(new URL(`${MANUAL}?facebook=connected`, requestUrl));
}


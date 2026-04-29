import { env } from "@/server/env";
import { META_GRAPH_API_VERSION } from "@/server/meta-graph";

/** Kurzlebiges User-Token in ein Long-Lived-Token tauschen (~60 Tage), damit Facebook länger verbunden bleibt. */
export async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<{
  access_token: string;
  expires_in?: number;
} | null> {
  if (!env.META_APP_ID || !env.META_APP_SECRET) return null;

  const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", env.META_APP_ID);
  url.searchParams.set("client_secret", env.META_APP_SECRET);
  url.searchParams.set("fb_exchange_token", shortLivedToken);

  const res = await fetch(url.toString());
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };

  if (!res.ok || !data.access_token) {
    console.warn("[meta] long-lived exchange", data.error?.message ?? res.status);
    return null;
  }
  return { access_token: data.access_token, expires_in: data.expires_in };
}

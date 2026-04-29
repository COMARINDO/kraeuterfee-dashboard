import { env } from "@/server/env";
import { META_GRAPH_API_VERSION } from "@/server/meta-graph";

type AccountRow = { id?: string; name?: string; access_token?: string };

export async function resolvePageAccess(
  userToken: string,
): Promise<{ pageId: string; pageToken: string; pageName?: string } | null> {
  const url = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userToken);
  const res = await fetch(url.toString());
  const json = (await res.json()) as { data?: AccountRow[]; error?: { message?: string } };
  if (!res.ok || !json.data?.length) {
    console.error("[facebook-page] me/accounts", json.error?.message ?? res.status);
    return null;
  }
  const pages = json.data.filter((p) => p.id && p.access_token);
  const preferred = env.META_PAGE_ID ? (pages.find((p) => p.id === env.META_PAGE_ID) ?? null) : null;
  const page = preferred ?? pages[0];
  if (!page?.id || !page.access_token) return null;
  return { pageId: page.id, pageToken: page.access_token, pageName: page.name };
}

export type PublishFacebookResult =
  | { ok: true; facebookPostId: string }
  | { ok: false; error: string };

export async function publishFacebookPagePost(args: {
  pageId: string;
  pageToken: string;
  message: string;
  image?: { buffer: Buffer; filename: string; contentType: string };
}): Promise<PublishFacebookResult> {
  const { pageId, pageToken, message, image } = args;
  try {
    if (image && image.buffer.length > 0) {
      const photoForm = new FormData();
      photoForm.append("caption", message);
      photoForm.append("published", "true");
      photoForm.append("access_token", pageToken);
      const file = new File([new Uint8Array(image.buffer)], image.filename, { type: image.contentType });
      photoForm.append("source", file);

      const photoUrl = `https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pageId}/photos`;
      const res = await fetch(photoUrl, { method: "POST", body: photoForm });
      const data = (await res.json()) as { id?: string; error?: { message?: string } };
      if (!res.ok || data.error) {
        return { ok: false, error: data.error?.message ?? "Facebook Foto-Post fehlgeschlagen" };
      }
      return { ok: true, facebookPostId: data.id ?? "" };
    }

    const feedUrl = new URL(`https://graph.facebook.com/${META_GRAPH_API_VERSION}/${pageId}/feed`);
    feedUrl.searchParams.set("message", message);
    feedUrl.searchParams.set("access_token", pageToken);
    const res = await fetch(feedUrl.toString(), { method: "POST" });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message ?? "Facebook Text-Post fehlgeschlagen" };
    }
    return { ok: true, facebookPostId: data.id ?? "" };
  } catch (e) {
    console.error(e);
    return { ok: false, error: "Netzwerkfehler zum Graph API" };
  }
}

import { publishFacebookPagePost, resolvePageAccess } from "@/server/facebook-page";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getSession(cookies());
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userToken = session.facebook?.accessToken;
  if (!userToken) {
    return NextResponse.json({ error: "Facebook nicht verbunden. Bitte unter Einstellungen verbinden." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ungültiges Formular" }, { status: 400 });
  }

  const messageRaw = form.get("message");
  const message = typeof messageRaw === "string" ? messageRaw.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Kein Post-Text." }, { status: 400 });
  }

  const image = form.get("image");
  const hasImage = image instanceof File && image.size > 0;

  if (hasImage) {
    const file = image as File;
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Nur Bilddateien erlaubt." }, { status: 400 });
    }
  }

  const page = await resolvePageAccess(userToken);
  if (!page) {
    return NextResponse.json(
      {
        error:
          "Keine verwaltbare Facebook-Seite gefunden. Scopes pages_show_list / Zugriff auf Seite prüfen; ggf. META_PAGE_ID setzen.",
      },
      { status: 400 },
    );
  }

  if (hasImage) {
    const file = image as File;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await publishFacebookPagePost({
      pageId: page.pageId,
      pageToken: page.pageToken,
      message,
      image: {
        buffer,
        filename: file.name || "photo.jpg",
        contentType: file.type || "image/jpeg",
      },
    });
    if (!result.ok) {
      console.error("[meta-publish] photos", result.error);
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: result.facebookPostId });
  }

  const result = await publishFacebookPagePost({
    pageId: page.pageId,
    pageToken: page.pageToken,
    message,
  });
  if (!result.ok) {
    console.error("[meta-publish] feed", result.error);
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: result.facebookPostId });
}

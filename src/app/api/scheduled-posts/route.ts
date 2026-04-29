import { encryptSecret } from "@/server/crypto-secret";
import { getPrisma } from "@/server/db";
import { resolvePageAccess } from "@/server/facebook-page";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const CreateSchema = z
  .object({
    message: z.string().min(1).max(12000),
    scheduledAt: z.string().min(1),
    imageBase64: z.string().max(8_000_000).optional(),
    imageMime: z.string().max(120).optional(),
  })
  .refine((d) => (d.imageBase64 == null) === (d.imageMime == null), {
    message: "Bild: imageBase64 und imageMime zusammen oder weglassen",
  });

export async function GET() {
  const session = await getSession(cookies());
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = getPrisma();
  const rows = await prisma.scheduledPost.findMany({
    where: { status: { in: ["PENDING", "FAILED"] } },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      message: true,
      scheduledAt: true,
      status: true,
      pageName: true,
      lastError: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ posts: rows });
}

function normalizeOptionalBase64(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const t = raw.trim();
  const m = /^data:image\/[^;]+;base64,([\s\S]*)$/.exec(t);
  const core = (m ? m[1] : t).replace(/\s/g, "");
  return core || undefined;
}

export async function POST(req: Request) {
  const session = await getSession(cookies());
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userToken = session.facebook?.accessToken;
  if (!userToken) {
    return NextResponse.json({ error: "Facebook nicht verbunden." }, { status: 400 });
  }

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.flatten() }, { status: 400 });
  }

  let scheduledAt: Date;
  try {
    scheduledAt = new Date(parsed.data.scheduledAt);
  } catch {
    return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
  }
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "Ungültiges Datum" }, { status: 400 });
  }

  const minLead = 60_000;
  if (scheduledAt.getTime() < Date.now() + minLead) {
    return NextResponse.json(
      { error: "Zeit muss mindestens eine Minute in der Zukunft liegen." },
      { status: 400 },
    );
  }

  const page = await resolvePageAccess(userToken);
  if (!page) {
    return NextResponse.json(
      { error: "Keine Facebook-Seite mit Token gefunden. META_PAGE_ID / Berechtigungen prüfen." },
      { status: 400 },
    );
  }

  let imageBase64: string | null = null;
  let imageMime: string | null = null;
  if (parsed.data.imageBase64 && parsed.data.imageMime) {
    if (!parsed.data.imageMime.startsWith("image/")) {
      return NextResponse.json({ error: "imageMime muss image/* sein" }, { status: 400 });
    }
    const normalized = normalizeOptionalBase64(parsed.data.imageBase64);
    if (!normalized) {
      return NextResponse.json({ error: "Bild-Daten fehlen" }, { status: 400 });
    }
    imageBase64 = normalized;
    imageMime = parsed.data.imageMime;
  }

  const prisma = getPrisma();
  const row = await prisma.scheduledPost.create({
    data: {
      message: parsed.data.message.trim(),
      imageBase64,
      imageMime,
      pageId: page.pageId,
      pageAccessTokenEnc: encryptSecret(page.pageToken),
      pageName: page.pageName ?? null,
      scheduledAt,
      status: "PENDING",
    },
    select: { id: true, scheduledAt: true },
  });

  return NextResponse.json({ ok: true, id: row.id, scheduledAt: row.scheduledAt.toISOString() });
}

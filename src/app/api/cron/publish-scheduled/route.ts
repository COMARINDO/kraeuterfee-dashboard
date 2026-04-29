import { decryptSecret } from "@/server/crypto-secret";
import { getPrisma } from "@/server/db";
import { env } from "@/server/env";
import { publishFacebookPagePost } from "@/server/facebook-page";
import { NextResponse } from "next/server";

/**
 * Vercel Cron (GET). Schutz: Authorization: Bearer CRON_SECRET
 * @see https://vercel.com/docs/cron-jobs
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    if (!env.CRON_SECRET) {
      console.error("[cron] CRON_SECRET fehlt");
      return NextResponse.json({ error: "CRON_SECRET nicht konfiguriert" }, { status: 503 });
    }
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const prisma = getPrisma();
  const now = new Date();

  const due = await prisma.scheduledPost.findMany({
    where: { status: "PENDING", scheduledAt: { lte: now } },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const post of due) {
    let pageToken: string;
    try {
      pageToken = decryptSecret(post.pageAccessTokenEnc);
    } catch (e) {
      console.error("[cron] decrypt", e);
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "FAILED", lastError: "Token-Entschlüsselung fehlgeschlagen" },
      });
      results.push({ id: post.id, ok: false, error: "decrypt" });
      continue;
    }

    const image =
      post.imageBase64 && post.imageMime
        ? {
            buffer: Buffer.from(post.imageBase64, "base64"),
            filename: "scheduled.jpg",
            contentType: post.imageMime,
          }
        : undefined;

    const pub = await publishFacebookPagePost({
      pageId: post.pageId,
      pageToken,
      message: post.message,
      image,
    });

    if (!pub.ok) {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "FAILED", lastError: pub.error.slice(0, 2000) },
      });
      results.push({ id: post.id, ok: false, error: pub.error });
      continue;
    }

    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        facebookPostId: pub.facebookPostId || null,
        lastError: null,
      },
    });
    results.push({ id: post.id, ok: true });
  }

  return NextResponse.json({ processed: results.length, results });
}

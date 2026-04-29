import { getPrisma } from "@/server/db";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await getSession(cookies());
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Fehlt" }, { status: 400 });

  const prisma = getPrisma();
  const existing = await prisma.scheduledPost.findFirst({
    where: { id, status: { in: ["PENDING", "FAILED"] } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Nicht gefunden oder bereits verarbeitet." }, { status: 404 });
  }

  await prisma.scheduledPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

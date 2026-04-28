import { env } from "@/server/env";
import { getSession } from "@/server/session";
import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const ok =
    email === env.APP_ADMIN_EMAIL.toLowerCase() &&
    parsed.data.password === env.APP_ADMIN_PASSWORD;

  if (!ok) {
    return NextResponse.json({ error: "E-Mail oder Passwort falsch." }, { status: 401 });
  }

  const session = await getSession(cookies());
  session.user = {
    id: "admin",
    email: env.APP_ADMIN_EMAIL.toLowerCase(),
    role: "ADMIN",
    displayName: "Admin",
  };
  await session.save();

  return NextResponse.json({ ok: true });
}


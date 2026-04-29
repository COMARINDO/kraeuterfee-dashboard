import { env } from "@/server/env";
import { getSession } from "@/server/session";
import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const BodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe." }, { status: 400 });
  }

  const username = parsed.data.username.trim().toLowerCase();
  const expected = (env.APP_ADMIN_USERNAME ?? env.APP_ADMIN_EMAIL).trim().toLowerCase();
  const ok = username === expected && parsed.data.password === env.APP_ADMIN_PASSWORD;

  if (!ok) {
    return NextResponse.json({ error: "Username oder Passwort falsch." }, { status: 401 });
  }

  const session = await getSession(cookies());
  session.user = {
    id: "admin",
    email: expected,
    role: "ADMIN",
    displayName: env.APP_ADMIN_USERNAME ?? "Admin",
  };
  await session.save();

  return NextResponse.json({ ok: true });
}


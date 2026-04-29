import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession(cookies());
  if (!session.user) {
    return NextResponse.json({ authenticated: false, connected: false });
  }
  return NextResponse.json({
    authenticated: true,
    connected: Boolean(session.facebook?.accessToken),
  });
}

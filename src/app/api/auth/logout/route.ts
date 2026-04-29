import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getSession(cookies());
  session.destroy();
  await session.save();
  return NextResponse.redirect(new URL("/", req.url));
}

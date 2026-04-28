import { env } from "@/server/env";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  email: string;
  role: "ADMIN" | "EDITOR";
  displayName?: string | null;
};

export type FacebookConnection = {
  connectedAt: string;
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
};

export type AppSession = IronSession<{
  user?: SessionUser;
  facebook?: FacebookConnection;
  /** CSRF token for Meta OAuth (Facebook Login) */
  metaOauthState?: string;
}>;

export const sessionOptions: SessionOptions = {
  password: env.SESSION_PASSWORD,
  cookieName: "kraeuterfee_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession(cookieStore: ReturnType<typeof cookies>): Promise<AppSession> {
  const store = await cookieStore;
  return getIronSession(store, sessionOptions);
}


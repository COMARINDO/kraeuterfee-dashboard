import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession(cookies());
  if (!session.user) redirect("/login");
  return children;
}


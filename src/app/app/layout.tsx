import { KraeuterfeeAppHeader } from "@/components/KraeuterfeeAppHeader";
import { KraeuterfeeBackdrop } from "@/components/KraeuterfeeBackdrop";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession(cookies());
  if (!session.user) redirect("/");

  return (
    <div className="relative flex min-h-full flex-1 flex-col text-[#2c342a]">
      <KraeuterfeeBackdrop />
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <KraeuterfeeAppHeader
          userLabel={session.user.displayName ?? session.user.email}
          facebookConnected={Boolean(session.facebook?.accessToken)}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

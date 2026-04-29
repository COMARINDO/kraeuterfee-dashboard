import Link from "next/link";

export function KraeuterfeeAppHeader({
  userLabel,
  facebookConnected,
}: {
  userLabel: string;
  facebookConnected: boolean;
}) {
  return (
    <header className="shrink-0 border-b border-white/60 bg-white/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="font-[family-name:var(--font-kraeuterfee-accent)] text-2xl font-semibold leading-none text-[#3d4a3e]">
            Kräuterfee
          </span>
          {facebookConnected ? (
            <span
              className="shrink-0 rounded-full bg-[#5a8f6e]/20 px-2.5 py-0.5 text-[11px] font-semibold text-[#3d6b4d]"
              title="Facebook verbunden"
            >
              Facebook
            </span>
          ) : (
            <Link
              href="/app/setup"
              className="shrink-0 text-xs font-semibold text-[#6b5b8e] underline decoration-[#c4b5fd] underline-offset-2 hover:text-[#5a4a7a]"
            >
              Facebook verbinden
            </Link>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden max-w-[160px] truncate text-xs text-[#5c6658] sm:inline">{userLabel}</span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-2xl border border-[#c8dccf] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#3d4a3e] shadow-sm transition hover:bg-white"
            >
              Abmelden
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

import Link from "next/link";
import { cookies } from "next/headers";
import { getSession } from "@/server/session";

export default async function AppHome() {
  const session = await getSession(cookies());

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="leading-tight">
            <div className="text-sm text-zinc-300">Kräuterfee</div>
            <div className="text-base font-semibold">Dashboard</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-300">{session.user?.email}</span>
            <form action="/api/auth/logout" method="post">
              <button className="rounded-xl border border-white/15 px-3 py-2 font-semibold">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-xl font-semibold tracking-tight">Setup</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Verbinde Facebook Page + Instagram Professional, damit Publishing
              und Inbox später API-gestützt funktionieren.
            </p>
            <p className="mt-3 text-sm">
              <span className="text-zinc-400">Facebook (OAuth): </span>
              <span className={session.facebook ? "text-emerald-300" : "text-amber-300"}>
                {session.facebook ? "in dieser Session verbunden" : "noch nicht verbunden"}
              </span>
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app/setup"
                className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
              >
                Meta Setup öffnen
              </Link>
              <Link
                href="/app/posts/manual"
                className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
              >
                Post vorbereiten
              </Link>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-zinc-200">
              Weiter (Reihenfolge)
            </h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-zinc-300">
              <li>
                Unter <strong className="text-zinc-200">Meta Setup</strong> Facebook verbinden
                (einmal im Browser abschließen).
              </li>
              <li>
                <strong className="text-zinc-200">Post vorbereiten</strong> – Text kopieren, in
                der Facebook-Page posten; Entwürfe bleiben im Browser gespeichert.
              </li>
              <li>
                Später: Kalender, API-Publishing, Inbox – wenn Meta-Berechtigungen
                und ggf. App-Review passen.
              </li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
}


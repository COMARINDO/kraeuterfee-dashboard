export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/60 font-bold">
              KF
            </div>
            <div className="leading-tight">
              <div className="text-sm text-zinc-300">Kräuterfee</div>
              <div className="text-base font-semibold">Social Dashboard</div>
            </div>
          </div>
          <a
            href="/login"
            className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            Anmelden
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">
              Plane Instagram & Facebook an einem Ort.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Entwürfe im Kalender, ein Publishing-Flow (manuell sofort, API
              optional) und eine Inbox für Kommentare.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950">
                Konto verbinden
              </button>
              <button className="rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold">
                Demo ansehen
              </button>
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              Tipp fürs iPhone: Nach dem Deploy in Safari öffnen → Teilen → „Zum
              Home-Bildschirm“.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-sm font-semibold text-zinc-200">MVP-Module</h2>
            <ul className="mt-4 grid gap-3 text-sm">
              <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold">Kalender</div>
                <div className="mt-1 text-zinc-300">
                  Entwürfe, Status, geplante Zeiten.
                </div>
              </li>
              <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold">Publishing</div>
                <div className="mt-1 text-zinc-300">
                  Publish-Paket (Copy/Media) + später API.
                </div>
              </li>
              <li className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="font-semibold">Inbox</div>
                <div className="mt-1 text-zinc-300">
                  Kommentare/Mentions + Workflow.
                </div>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

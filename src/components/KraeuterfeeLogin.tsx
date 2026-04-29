"use client";

import Image from "next/image";
import { KraeuterfeeBackdrop } from "@/components/KraeuterfeeBackdrop";
import { useState, type FormEvent } from "react";

export function KraeuterfeeLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Login fehlgeschlagen.");
      }
      window.location.href = "/app/posts/manual";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 overflow-hidden">
      <KraeuterfeeBackdrop />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-8 px-4 py-10 md:flex-row md:items-stretch md:justify-between md:gap-12 md:py-14 lg:px-8">
        {/* Character — welcoming mascot */}
        <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center md:max-w-md md:items-end">
          <div className="relative aspect-square w-full max-w-[min(100%,320px)] md:max-w-[380px]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-100/80 via-white/40 to-violet-200/50 shadow-[0_25px_60px_-15px_rgba(90,143,110,0.35),0_0_0_1px_rgba(255,255,255,0.8)_inset] ring-4 ring-white/70" />
            <div className="relative h-full w-full overflow-hidden rounded-full p-1.5">
              <Image
                src="/kraeuterfee-welcome.png"
                alt="Kräuterfee"
                width={760}
                height={760}
                priority
                className="h-full w-full rounded-full object-cover object-[center_15%] shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Login card */}
        <div className="flex w-full max-w-md flex-1 flex-col justify-center">
          <div className="rounded-[2rem] border border-white/70 bg-white/55 p-8 shadow-[0_20px_50px_-20px_rgba(61,84,62,0.25)] backdrop-blur-xl backdrop-bl saturate-150 md:p-10">
            <p className="font-[family-name:var(--font-kraeuterfee-accent)] text-3xl font-medium leading-tight text-[#3d4a3e] md:text-4xl">
              Willkommen
            </p>
            <h1 className="mt-2 text-lg font-semibold tracking-tight text-[#5a8f6e]">
              Kräuterfee
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-[#5c6658]">Melde dich an, um weiterzugehen.</p>

            <form onSubmit={onSubmit} className="mt-8 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[#3d4a3e]">
                <span>Benutzername</span>
                <input
                  className="h-12 rounded-2xl border border-[#c8dccf] bg-white/80 px-4 text-[#2c342a] shadow-sm outline-none transition placeholder:text-[#8a9687] focus:border-[#7b9e86] focus:ring-2 focus:ring-[#7b9e86]/25"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  type="text"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[#3d4a3e]">
                <span>Passwort</span>
                <input
                  className="h-12 rounded-2xl border border-[#c8dccf] bg-white/80 px-4 text-[#2c342a] shadow-sm outline-none transition focus:border-[#7b9e86] focus:ring-2 focus:ring-[#7b9e86]/25"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? (
                <div
                  className="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-12 rounded-2xl bg-[#5a8f6e] text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(90,143,110,0.55)] transition hover:bg-[#4e7f62] disabled:opacity-60"
              >
                {loading ? "Einen Moment…" : "Anmelden"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

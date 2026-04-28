"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Login fehlgeschlagen.");
      }
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-950 text-zinc-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-xl font-semibold tracking-tight">Anmelden</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Zugriff auf das Kräuterfee Dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-zinc-300">E-Mail</span>
            <input
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-emerald-400/60"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-zinc-300">Passwort</span>
            <input
              className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-emerald-400/60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="mt-2 h-11 rounded-xl bg-emerald-500 font-semibold text-emerald-950 disabled:opacity-60"
          >
            {loading ? "…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}


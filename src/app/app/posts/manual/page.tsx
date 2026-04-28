"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_HASHTAGS = "#Kraeuterfee #KraeutergartenWeinburg #Wildkraeuter #Kraeutergarten";
const DRAFT_KEY = "kraeuterfee-manual-post-v1";

export default function ManualPostPage() {
  const [topic, setTopic] = useState("Saisonaler Kräutertipp");
  const [caption, setCaption] = useState(
    "Heute aus dem Kräutergarten Weinburg: Ein kleiner Kräutertipp für deinen Alltag.",
  );
  const [hashtags, setHashtags] = useState(DEFAULT_HASHTAGS);
  const [copied, setCopied] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setDraftRestored(true);
        return;
      }
      const p = JSON.parse(raw) as { topic?: string; caption?: string; hashtags?: string };
      if (typeof p.topic === "string") setTopic(p.topic);
      if (typeof p.caption === "string") setCaption(p.caption);
      if (typeof p.hashtags === "string") setHashtags(p.hashtags);
    } catch {
      // ignore
    }
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ topic, caption, hashtags }),
      );
    } catch {
      // ignore
    }
  }, [topic, caption, hashtags, draftRestored]);

  const postText = useMemo(
    () => [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n"),
    [caption, hashtags],
  );

  async function copyPost() {
    await navigator.clipboard.writeText(postText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="leading-tight">
            <div className="text-sm text-zinc-300">Kräuterfee</div>
            <div className="text-base font-semibold">Post vorbereiten</div>
          </div>
          <Link
            href="/app"
            className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
          >
            Zurück
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-10 md:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Facebook-Post manuell vorbereiten
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Bis die Meta API verbunden ist, kannst du hier Beiträge erstellen,
            kopieren und direkt in Facebook posten.
          </p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm">
              <span className="text-zinc-300">Thema</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-emerald-400/60"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-zinc-300">Text</span>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={8}
                className="rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-emerald-400/60"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-zinc-300">Hashtags</span>
              <textarea
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                rows={3}
                className="rounded-xl border border-white/10 bg-black/30 p-3 outline-none focus:border-emerald-400/60"
              />
            </label>
          </div>
        </section>

        <aside className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-sm font-semibold text-zinc-200">Publish Pack</h2>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-zinc-100 whitespace-pre-wrap">
            {postText}
          </div>
          <button
            onClick={copyPost}
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
          >
            {copied ? "Kopiert" : "Text kopieren"}
          </button>
          <a
            href="https://www.facebook.com/profile.php?id=61560644438066"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex w-full justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
          >
            Facebook Page öffnen
          </a>
          <p className="mt-4 text-xs leading-5 text-zinc-400">
            Entwurf (Thema, Text, Hashtags) wird automatisch in diesem Browser
            gespeichert. Kalender und API-Posting sind die nächsten Ausbaustufen.
          </p>
        </aside>
      </main>
    </div>
  );
}


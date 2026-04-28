"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_HASHTAGS = "#Kraeuterfee #KraeutergartenWeinburg #Wildkraeuter #Kraeutergarten";
const DRAFT_KEY = "kraeuterfee-manual-post-v1";
const SAVED_PLANT_POSTS_KEY = "kraeuterfee-saved-plant-posts-v1";
const MAX_POST_IMAGE_BYTES = 2 * 1024 * 1024;

type SavedPlantPost = {
  plant: string;
  text: string;
  createdAt: number;
  hashtags?: string[];
  /** data:image/…;base64,… */
  image?: string;
};

type HashtagVariant = "local" | "general";

function isSavedPlantPost(x: unknown): x is SavedPlantPost {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o.plant !== "string" || typeof o.text !== "string" || typeof o.createdAt !== "number") {
    return false;
  }
  if (o.hashtags !== undefined) {
    if (!Array.isArray(o.hashtags) || !o.hashtags.every((h) => typeof h === "string")) return false;
  }
  if (o.image !== undefined && typeof o.image !== "string") return false;
  return true;
}

function isTooGenericClient(text: string): boolean {
  return /beliebt|gesund|vielseitig/i.test(text);
}

function hashtagsArrayToLine(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .join(" ");
}

function loadSavedPlantPosts(): SavedPlantPost[] {
  try {
    const raw = localStorage.getItem(SAVED_PLANT_POSTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(isSavedPlantPost);
  } catch {
    return [];
  }
}

export default function ManualPostPage() {
  const [topic, setTopic] = useState("Saisonaler Kräutertipp");
  const [caption, setCaption] = useState(
    "Heute aus dem Kräutergarten Weinburg: Ein kleiner Kräutertipp für deinen Alltag.",
  );
  const [hashtags, setHashtags] = useState(DEFAULT_HASHTAGS);
  const [copied, setCopied] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const [plantName, setPlantName] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [copiedGenerated, setCopiedGenerated] = useState(false);
  const [copiedGeneratedTags, setCopiedGeneratedTags] = useState(false);
  const [isTooGeneric, setIsTooGeneric] = useState<boolean | null>(null);
  const [savedPosts, setSavedPosts] = useState<SavedPlantPost[]>([]);
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [hashtagVariant, setHashtagVariant] = useState<HashtagVariant>("local");
  /** Wenn aktiv: erfolgreiche Generierung schreibt in Text- und Hashtag-Felder (Publish Pack). */
  const [useGenerator, setUseGenerator] = useState(true);
  const useGeneratorRef = useRef(useGenerator);
  useGeneratorRef.current = useGenerator;

  const [postImageSrc, setPostImageSrc] = useState<string | null>(null);
  const [imagePickError, setImagePickError] = useState("");
  const [saveError, setSaveError] = useState("");
  const pendingImageObjectUrlRef = useRef<string | null>(null);

  function revokePendingImageObjectUrl() {
    if (pendingImageObjectUrlRef.current) {
      URL.revokeObjectURL(pendingImageObjectUrlRef.current);
      pendingImageObjectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => revokePendingImageObjectUrl();
  }, []);

  function clearPostImage() {
    revokePendingImageObjectUrl();
    setPostImageSrc(null);
    setImagePickError("");
  }

  function handlePostImageFile(file: File) {
    setImagePickError("");
    if (!file.type.startsWith("image/")) {
      setImagePickError("Bitte eine Bilddatei wählen.");
      return;
    }
    if (file.size > MAX_POST_IMAGE_BYTES) {
      setImagePickError("Datei zu groß (max. 2 MB).");
      return;
    }
    revokePendingImageObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    pendingImageObjectUrlRef.current = objectUrl;
    setPostImageSrc(objectUrl);

    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") return;
      revokePendingImageObjectUrl();
      setPostImageSrc(r);
    };
    reader.onerror = () => {
      revokePendingImageObjectUrl();
      setPostImageSrc(null);
      setImagePickError("Bild konnte nicht gelesen werden.");
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    setSavedPosts(loadSavedPlantPosts());
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setDraftRestored(true);
        return;
      }
      const p = JSON.parse(raw) as {
        topic?: string;
        caption?: string;
        hashtags?: string;
        useGenerator?: boolean;
      };
      if (typeof p.topic === "string") setTopic(p.topic);
      if (typeof p.caption === "string") setCaption(p.caption);
      if (typeof p.hashtags === "string") setHashtags(p.hashtags);
      if (typeof p.useGenerator === "boolean") setUseGenerator(p.useGenerator);
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
        JSON.stringify({ topic, caption, hashtags, useGenerator }),
      );
    } catch {
      // ignore
    }
  }, [topic, caption, hashtags, useGenerator, draftRestored]);

  const postText = useMemo(
    () => [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n"),
    [caption, hashtags],
  );

  async function copyPost() {
    await navigator.clipboard.writeText(postText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const generatedHashtagLine = useMemo(
    () => generatedHashtags.filter(Boolean).join(" "),
    [generatedHashtags],
  );

  async function generatePlantPost() {
    if (plantName.trim().length < 3) {
      setGenerateError("Pflanzenname: mindestens 3 Zeichen.");
      return;
    }
    setGenerateError("");
    setGenerateLoading(true);
    setIsTooGeneric(null);
    setGeneratedHashtags([]);
    try {
      const res = await fetch("/api/generate-plant-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plant: plantName.trim(),
          hashtagVariant,
        }),
      });
      const data = (await res.json()) as {
        text?: string;
        hashtags?: string[];
        isTooGeneric?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setGenerateError(data.error ?? "Generierung fehlgeschlagen");
        setGeneratedText("");
        setGeneratedHashtags([]);
        setIsTooGeneric(null);
        return;
      }
      if (typeof data.text === "string") setGeneratedText(data.text);
      const nextTags = Array.isArray(data.hashtags)
        ? data.hashtags.filter((h) => typeof h === "string")
        : [];
      setGeneratedHashtags(nextTags);
      if (useGeneratorRef.current && typeof data.text === "string") {
        setCaption(data.text.trim());
        setHashtags(hashtagsArrayToLine(nextTags));
      }
    } catch {
      setGenerateError("Netzwerkfehler");
      setGeneratedText("");
      setGeneratedHashtags([]);
      setIsTooGeneric(null);
    } finally {
      setGenerateLoading(false);
    }
  }

  function saveGeneratedPost() {
    setSaveError("");
    const plant = plantName.trim();
    const text = generatedText.trim();
    if (!plant || !text) return;
    const imageForStore =
      postImageSrc && postImageSrc.startsWith("data:") ? postImageSrc : undefined;
    const entry: SavedPlantPost = {
      plant,
      text,
      hashtags: generatedHashtags.length ? [...generatedHashtags] : undefined,
      image: imageForStore,
      createdAt: Date.now(),
    };
    setSavedPosts((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      try {
        localStorage.setItem(SAVED_PLANT_POSTS_KEY, JSON.stringify(next));
      } catch (e) {
        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          setSaveError(
            "Speicher voll: gespeicherte Posts oder Bilder reduzieren (kleineres Bild).",
          );
        } else {
          setSaveError("Speichern fehlgeschlagen.");
        }
        return prev;
      }
      return next;
    });
  }

  function deleteSavedPost(createdAt: number) {
    setSavedPosts((prev) => {
      const next = prev.filter((p) => p.createdAt !== createdAt);
      try {
        localStorage.setItem(SAVED_PLANT_POSTS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function insertSavedPost(p: SavedPlantPost) {
    setGeneratedText(p.text);
    setPlantName(p.plant);
    const tags = Array.isArray(p.hashtags) ? p.hashtags : [];
    setGeneratedHashtags(tags);
    setCaption(p.text.trim());
    setHashtags(tags.length ? hashtagsArrayToLine(tags) : "");
    if (p.image) {
      revokePendingImageObjectUrl();
      setPostImageSrc(p.image);
    } else {
      clearPostImage();
    }
  }

  useEffect(() => {
    if (generateLoading) return;
    if (!generatedText.trim()) {
      setIsTooGeneric(null);
      return;
    }
    setIsTooGeneric(isTooGenericClient(generatedText));
  }, [generatedText, generateLoading]);

  function fullGeneratedForClipboard(): string {
    const body = generatedText.trim();
    if (!generatedHashtagLine) return body;
    return `${body}\n\n${generatedHashtagLine}`;
  }

  async function copyGenerated() {
    const payload = fullGeneratedForClipboard();
    if (!payload) return;
    await navigator.clipboard.writeText(payload);
    setCopiedGenerated(true);
    window.setTimeout(() => setCopiedGenerated(false), 2000);
  }

  async function copyGeneratedHashtagsOnly() {
    if (!generatedHashtagLine) return;
    await navigator.clipboard.writeText(generatedHashtagLine);
    setCopiedGeneratedTags(true);
    window.setTimeout(() => setCopiedGeneratedTags(false), 2000);
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

          <div className="mt-8 rounded-xl border border-emerald-500/25 bg-emerald-950/20 p-5">
            <h2 className="text-sm font-semibold text-emerald-100/95">
              Pflanzen-Post generieren
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Für die Marke „Wildkräuter Fee“: Pflanze nennen, Post generieren (lokal für Weinburg und
              Pielachtal, Klartext ohne Emojis im Beitrag).
            </p>
            <label className="mt-4 grid gap-2 text-sm">
              <span className="text-zinc-300">Pflanzenname</span>
              <input
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                placeholder="z. B. Spitzwegerich"
                className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-emerald-400/60"
              />
              <p className="text-xs text-zinc-500">Mindestens 3 Zeichen für die Generierung.</p>
            </label>
            <div className="mt-3 flex flex-col gap-2">
              <span className="text-xs text-zinc-400">Hashtag-Fokus (nächste Generierung)</span>
              <div
                className="inline-flex w-fit rounded-lg border border-white/10 p-0.5"
                role="group"
                aria-label="Hashtag-Fokus"
              >
                <button
                  type="button"
                  onClick={() => setHashtagVariant("local")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    hashtagVariant === "local"
                      ? "bg-emerald-600/90 text-emerald-950"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Lokal
                </button>
                <button
                  type="button"
                  onClick={() => setHashtagVariant("general")}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    hashtagVariant === "general"
                      ? "bg-emerald-600/90 text-emerald-950"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Allgemein
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={generateLoading || plantName.trim().length < 3}
                onClick={() => void generatePlantPost()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40"
              >
                {generateLoading ? "Generiere…" : "Post generieren"}
              </button>
              <button
                type="button"
                disabled={generateLoading || plantName.trim().length < 3}
                onClick={() => void generatePlantPost()}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Neu generieren
              </button>
            </div>
            {generateLoading ? (
              <p className="mt-2 text-xs text-zinc-400" aria-live="polite">
                Text wird erstellt …
              </p>
            ) : null}
            {generateError ? (
              <p className="mt-2 text-xs text-red-300" role="alert">
                {generateError}
              </p>
            ) : null}
            {isTooGeneric === true ? (
              <p className="mt-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Dieser Text ist noch zu allgemein – bitte erneut generieren.
              </p>
            ) : null}
            <label className="mt-4 grid gap-2 text-sm">
              <span className="text-zinc-300">Generierter Text</span>
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                disabled={generateLoading}
                rows={10}
                placeholder="Hier erscheint der generierte Post…"
                className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-relaxed outline-none focus:border-emerald-400/60 disabled:opacity-50"
              />
            </label>

            <div className="mt-4 grid gap-2 text-sm">
              <span className="text-zinc-300">Bild für Facebook (optional)</span>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={generateLoading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) handlePostImageFile(f);
                  }}
                  className="max-w-full text-xs text-zinc-300 file:mr-2 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-emerald-950"
                />
                {postImageSrc ? (
                  <button
                    type="button"
                    onClick={clearPostImage}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    Bild entfernen
                  </button>
                ) : null}
              </div>
              {imagePickError ? (
                <p className="text-xs text-red-300" role="alert">
                  {imagePickError}
                </p>
              ) : null}
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/25 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Post-Vorschau
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
                {generatedText.trim() || (
                  <span className="text-zinc-500">Noch kein Text – zuerst generieren.</span>
                )}
              </p>
              {postImageSrc ? (
                <div className="mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={postImageSrc}
                    alt=""
                    className="max-h-56 w-full max-w-md rounded-lg border border-white/10 object-contain"
                  />
                </div>
              ) : null}
              {generatedHashtagLine ? (
                <p
                  className="mt-4 break-words text-xs leading-relaxed text-emerald-200/90"
                  aria-label="Hashtags in der Vorschau"
                >
                  {generatedHashtagLine}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-zinc-500">
                Text und Hashtags kannst du mit den Buttons kopieren; das Bild lädst du in Facebook
                separat hoch.
              </p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={!generatedText.trim() || generateLoading}
                onClick={() => void copyGenerated()}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {copiedGenerated ? "Kopiert" : "Post kopieren"}
              </button>
              <button
                type="button"
                disabled={!generatedHashtagLine || generateLoading}
                onClick={() => void copyGeneratedHashtagsOnly()}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                {copiedGeneratedTags ? "Kopiert" : "Hashtags kopieren"}
              </button>
              <button
                type="button"
                disabled={!generatedText.trim() || !plantName.trim() || generateLoading}
                onClick={saveGeneratedPost}
                className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-100 disabled:opacity-40 sm:col-span-2"
              >
                Speichern
              </button>
            </div>
            {saveError ? (
              <p className="mt-2 text-xs text-red-300" role="alert">
                {saveError}
              </p>
            ) : null}

            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Gespeicherte Posts
              </h3>
              {savedPosts.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">Noch keine gespeicherten Posts.</p>
              ) : (
                <ul className="mt-3 grid gap-2">
                  {savedPosts.map((p) => (
                    <li
                      key={`${p.createdAt}-${p.plant}`}
                      className="flex flex-col gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 gap-3">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-md border border-white/10 object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-white/15 text-[10px] text-zinc-500">
                            kein Bild
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-zinc-100">{p.plant}</div>
                          <p className="mt-1 break-words text-xs text-zinc-400">
                            {p.text.length > 100 ? `${p.text.slice(0, 100)}…` : p.text}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                        <button
                          type="button"
                          onClick={() => insertSavedPost(p)}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold"
                        >
                          Einfügen
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedPost(p.createdAt)}
                          className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-200"
                        >
                          Löschen
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-200">Publish-Entwurf</span>
                <div
                  className="inline-flex w-fit rounded-lg border border-white/10 p-0.5"
                  role="group"
                  aria-label="Generator für Publish Pack"
                >
                  <button
                    type="button"
                    onClick={() => setUseGenerator(true)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      useGenerator
                        ? "bg-emerald-600/90 text-emerald-950"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Generator verwenden
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseGenerator(false)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      !useGenerator
                        ? "bg-emerald-600/90 text-emerald-950"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Nur manuell
                  </button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-zinc-500">
                {useGenerator
                  ? "Nach „Post generieren“ werden Text und Hashtags hier und im Publish Pack übernommen. Du kannst alles noch anpassen."
                  : "Generierung aktualisiert nur den grünen Bereich oben. Publish Pack nutzt ausschließlich die Felder unten."}
              </p>
            </div>

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
          <p className="mt-1 text-xs text-zinc-500">
            Vorschau: Beitragstext, Leerzeile, Hashtags (wie beim Kopieren nach Facebook).
          </p>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-zinc-100 whitespace-pre-wrap">
            {postText || (
              <span className="text-zinc-500">Noch kein Text – generieren oder manuell ausfüllen.</span>
            )}
          </div>
          <button
            onClick={copyPost}
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
          >
            {copied ? "Kopiert" : "Publish Pack kopieren"}
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
            Entwurf (Thema, Text, Hashtags, Generator-Modus) wird automatisch in diesem Browser
            gespeichert. Kalender und API-Posting sind die nächsten Ausbaustufen.
          </p>
        </aside>
      </main>
    </div>
  );
}


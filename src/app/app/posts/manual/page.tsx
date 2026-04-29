"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const FIXED_COPY_HASHTAGS = "#Weinburg #Kräuter #Naturgarten #Wildkräuter #Pielachtal";

function toDatetimeLocalValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function imageSrcToFile(src: string | null): Promise<File | null> {
  if (!src) return null;
  if (src.startsWith("data:") || src.startsWith("blob:")) {
    const res = await fetch(src);
    const blob = await res.blob();
    return new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" });
  }
  return null;
}

async function imageSrcToBase64Parts(src: string | null): Promise<{ imageBase64: string; imageMime: string } | null> {
  if (!src) return null;
  if (src.startsWith("data:")) {
    const mime = src.slice(5, src.indexOf(";")) || "image/jpeg";
    const b64 = src.split(",", 2)[1] ?? "";
    if (!b64) return null;
    return { imageBase64: b64, imageMime: mime };
  }
  const file = await imageSrcToFile(src);
  if (!file) return null;
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const comma = s.indexOf(",");
      const mime = file.type || "image/jpeg";
      const b64 = comma >= 0 ? s.slice(comma + 1) : "";
      if (!b64) {
        resolve(null);
        return;
      }
      resolve({ imageBase64: b64, imageMime: mime });
    };
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

type ScheduledRow = {
  id: string;
  message: string;
  scheduledAt: string;
  status: string;
  pageName: string | null;
  lastError: string | null;
  createdAt: string;
};

export default function ManualPostPage() {
  const [input, setInput] = useState("");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [skipAiImage, setSkipAiImage] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [postBody, setPostBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState<boolean | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [postOk, setPostOk] = useState(false);
  const [postError, setPostError] = useState("");

  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState("");
  const [scheduleErr, setScheduleErr] = useState("");
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledRow[]>([]);
  const [fbNotice, setFbNotice] = useState<string | null>(null);
  const [fbNoticeTone, setFbNoticeTone] = useState<"ok" | "err">("ok");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingObjectUrlRef = useRef<string | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  const minScheduleValue = useMemo(() => toDatetimeLocalValue(new Date(Date.now() + 120_000)), []);

  const loadScheduled = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduled-posts");
      const data = (await res.json()) as { posts?: ScheduledRow[] };
      if (res.ok && Array.isArray(data.posts)) setScheduledPosts(data.posts);
    } catch {
      /* ignore */
    }
  }, []);

  function revokePendingObjectUrl() {
    if (pendingObjectUrlRef.current) {
      URL.revokeObjectURL(pendingObjectUrlRef.current);
      pendingObjectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      revokePendingObjectUrl();
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    void loadScheduled();
  }, [loadScheduled]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("facebook");
    if (!q) return;
    if (q === "connected") {
      setFbNotice("Facebook ist verbunden.");
      setFbNoticeTone("ok");
    } else if (q === "cancelled") {
      setFbNotice("Abgebrochen.");
      setFbNoticeTone("err");
    } else if (q === "state-mismatch" || q === "config-missing") {
      setFbNotice("Bitte erneut verbinden oder Konfiguration prüfen.");
      setFbNoticeTone("err");
    } else {
      try {
        setFbNotice(decodeURIComponent(q).slice(0, 240));
      } catch {
        setFbNotice(q.slice(0, 240));
      }
      setFbNoticeTone("err");
    }
    window.history.replaceState({}, "", "/app/posts/manual");
    void (async () => {
      try {
        const res = await fetch("/api/meta/facebook/status");
        const data = (await res.json()) as { connected?: boolean };
        if (data.connected) setFacebookConnected(true);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function clearImage() {
    revokePendingObjectUrl();
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFile(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Bitte eine Bilddatei wählen.");
      return;
    }
    revokePendingObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    pendingObjectUrlRef.current = objectUrl;
    setImageSrc(objectUrl);

    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") return;
      revokePendingObjectUrl();
      setImageSrc(r);
    };
    reader.onerror = () => {
      revokePendingObjectUrl();
      setImageSrc(null);
      setError("Bild konnte nicht gelesen werden.");
    };
    reader.readAsDataURL(file);
  }

  const copyPayload = useMemo(() => {
    const body = postBody.trim();
    if (!body) return "";
    return `${body}\n\n${FIXED_COPY_HASHTAGS}`;
  }, [postBody]);

  async function createPost() {
    setError("");
    if (!imageSrc && input.trim().length === 0) {
      setError("Bitte Text eingeben oder ein Bild auswählen.");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      if (input.trim()) fd.append("text", input.trim());
      fd.append("skipAiImage", skipAiImage ? "1" : "0");

      if (imageSrc && (imageSrc.startsWith("data:") || imageSrc.startsWith("blob:"))) {
        const file = await imageSrcToFile(imageSrc);
        if (file) fd.append("image", file);
      }

      const res = await fetch("/api/generate-post", { method: "POST", body: fd });
      const data = (await res.json()) as {
        text?: string;
        imageBase64?: string;
        imageMime?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Generierung fehlgeschlagen");
        return;
      }
      const next = typeof data.text === "string" ? data.text.trim() : "";
      if (!next) {
        setError("Keine Antwort vom Modell");
        return;
      }
      setPostBody(next);
      if (data.imageBase64 && data.imageMime) {
        setImageSrc(`data:${data.imageMime};base64,${data.imageBase64}`);
      }
    } catch {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/meta/facebook/status");
        const data = (await res.json()) as { authenticated?: boolean; connected?: boolean };
        if (cancelled) return;
        if (!data.authenticated) {
          setFacebookConnected(false);
          return;
        }
        setFacebookConnected(Boolean(data.connected));
      } catch {
        if (!cancelled) setFacebookConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function postToFacebook() {
    setPostError("");
    setPostOk(false);
    if (!copyPayload) {
      setPostError("Erst einen Post generieren oder Text schreiben.");
      return;
    }
    if (!facebookConnected) {
      setPostError("Facebook unter „Einstellungen“ verbinden.");
      return;
    }
    setPostLoading(true);
    try {
      const fd = new FormData();
      fd.append("message", copyPayload);
      const img = await imageSrcToFile(imageSrc);
      if (img) fd.append("image", img);

      const res = await fetch("/api/meta/facebook/publish", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setPostError(data.error ?? "Facebook-Post fehlgeschlagen");
        return;
      }
      setPostOk(true);
      window.setTimeout(() => setPostOk(false), 2500);
    } catch {
      setPostError("Netzwerkfehler");
    } finally {
      setPostLoading(false);
    }
  }

  async function saveSchedule() {
    setScheduleErr("");
    setScheduleMsg("");
    if (!copyPayload) {
      setScheduleErr("Kein Post-Text.");
      return;
    }
    if (!scheduleAt) {
      setScheduleErr("Datum und Uhrzeit wählen.");
      return;
    }
    if (!facebookConnected) {
      setScheduleErr("Facebook verbinden, damit ein Seiten-Token gespeichert werden kann.");
      return;
    }
    const when = new Date(scheduleAt);
    if (Number.isNaN(when.getTime())) {
      setScheduleErr("Ungültiges Datum.");
      return;
    }
    setScheduleLoading(true);
    try {
      const payload: Record<string, string> = {
        message: copyPayload,
        scheduledAt: when.toISOString(),
      };
      const imgParts = await imageSrcToBase64Parts(imageSrc);
      if (imgParts) {
        payload.imageBase64 = imgParts.imageBase64;
        payload.imageMime = imgParts.imageMime;
      }
      const res = await fetch("/api/scheduled-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setScheduleErr(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setScheduleMsg("Geplant gespeichert.");
      setScheduleAt("");
      await loadScheduled();
      window.setTimeout(() => setScheduleMsg(""), 4000);
    } catch {
      setScheduleErr("Netzwerkfehler");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function removeScheduled(id: string) {
    const res = await fetch(`/api/scheduled-posts/${id}`, { method: "DELETE" });
    if (res.ok) void loadScheduled();
  }

  async function copyPost() {
    if (!copyPayload) return;
    await navigator.clipboard.writeText(copyPayload);
    setCopied(true);
    if (copyTimeoutRef.current) window.clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
  }

  const hasPostText = postBody.trim().length > 0;

  const inputField =
    "w-full rounded-2xl border border-[#c8dccf] bg-white/85 px-4 py-3 text-sm text-[#2c342a] shadow-sm outline-none placeholder:text-[#8a9687] focus:border-[#7b9e86] focus:ring-2 focus:ring-[#7b9e86]/20";
  const panel =
    "rounded-[2rem] border border-white/70 bg-white/50 p-6 shadow-[0_20px_50px_-20px_rgba(61,84,62,0.18)] backdrop-blur-xl backdrop-saturate-150 md:p-8";
  const btnSecondary =
    "rounded-2xl border border-[#c8dccf] bg-white/75 px-3 py-2 text-xs font-semibold text-[#3d4a3e] shadow-sm transition hover:bg-white disabled:opacity-40";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      {fbNotice ? (
        <div
          className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
            fbNoticeTone === "ok"
              ? "border-[#7b9e86]/40 bg-[#5a8f6e]/10 text-[#2d4a38]"
              : "border-red-200/90 bg-red-50/95 text-red-900"
          }`}
          role="status"
        >
          {fbNotice}
        </div>
      ) : null}

      <div className={`${panel} space-y-6`}>
        <div>
          <h1 className="font-[family-name:var(--font-kraeuterfee-accent)] text-2xl font-medium text-[#3d4a3e] md:text-3xl">
            Neuer Post
          </h1>
          <p className="mt-1 text-sm text-[#5c6658]">Text oder Foto – dann generieren.</p>
        </div>

        <label className="grid gap-2 text-sm font-medium text-[#3d4a3e]">
          <span>Idee / Beobachtung</span>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Kurz beschreiben…"
            rows={5}
            className={inputField}
          />
        </label>

        <div className="grid gap-2 text-sm">
          <span className="font-medium text-[#3d4a3e]">Bild (optional)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={loading} onClick={() => fileInputRef.current?.click()} className={btnSecondary}>
              {imageSrc ? "Neues Bild" : "Bild wählen"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => cameraInputRef.current?.click()}
              className={btnSecondary}
            >
              Foto
            </button>
            {imageSrc ? (
              <button type="button" disabled={loading} onClick={clearImage} className={btnSecondary}>
                Entfernen
              </button>
            ) : null}
          </div>
          {imageSrc ? (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt=""
                className="max-h-56 w-full max-w-md rounded-2xl border border-[#c8dccf]/80 object-contain shadow-sm"
              />
            </div>
          ) : null}
        </div>

        {input.trim() && !imageSrc ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dce8df] bg-white/55 px-4 py-3 text-sm text-[#3d4a3e]">
            <input
              type="checkbox"
              checked={skipAiImage}
              onChange={(e) => setSkipAiImage(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#a8bcaa] text-[#5a8f6e] focus:ring-[#7b9e86]/30"
            />
            <span>
              <span className="font-medium">Kein KI-Bild erzeugen</span>
              <span className="mt-0.5 block text-xs font-normal leading-relaxed text-[#6b7568]">
                Nur Text generieren (schneller, keine Bild-API-Kosten).
              </span>
            </span>
          </label>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => void createPost()}
          className="h-12 w-full rounded-2xl bg-[#5a8f6e] text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(90,143,110,0.45)] transition hover:bg-[#4e7f62] disabled:opacity-40"
        >
          {loading ? "Bitte warten…" : "Post generieren"}
        </button>
        {input.trim() && !imageSrc && !skipAiImage ? (
          <p className="text-center text-xs leading-relaxed text-[#6b7568]">
            Ohne Foto wird ein Kräuterfee-Bild passend zum Text erzeugt (Marke + Figur aus{" "}
            <code className="rounded bg-[#eef4ef] px-1 font-mono text-[11px]">public/kraeuterfee-mascot.png</code>{" "}
            falls vorhanden — sonst Stil per Text). Dauert etwas länger.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className={`${panel} mt-6 space-y-4`}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[#6b7568]">Text</h2>
        <label className="grid gap-1">
          <span className="sr-only">Beitrag</span>
          <textarea
            value={postBody}
            onChange={(e) => setPostBody(e.target.value)}
            placeholder="Generiert oder selbst schreiben…"
            rows={10}
            className={inputField}
          />
        </label>
        {hasPostText ? (
          <p className="text-xs text-[#6b7568]">
            Hashtags werden angehängt:{" "}
            <span className="text-[#5a8f6e]">{FIXED_COPY_HASHTAGS}</span>
          </p>
        ) : null}

        {!facebookConnected && hasPostText ? (
          <p className="text-sm text-[#8a6d3d]">
            Für Facebook:{" "}
            <Link href="/app/setup" className="font-semibold text-[#6b5b8e] underline underline-offset-2">
              verbinden
            </Link>
            .
          </p>
        ) : null}

        {hasPostText ? (
          <>
            <div className="grid gap-2 border-t border-[#dce8df] pt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7568]">Geplant posten</span>
              <input
                type="datetime-local"
                min={minScheduleValue}
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className={inputField}
              />
              <button
                type="button"
                disabled={scheduleLoading || !facebookConnected || !copyPayload || !scheduleAt}
                onClick={() => void saveSchedule()}
                className="h-11 rounded-2xl border border-[#c4b5fd]/60 bg-[#f5f3ff]/90 text-sm font-semibold text-[#5b4d7a] shadow-sm transition hover:bg-[#ede9fe] disabled:opacity-40"
              >
                {scheduleLoading ? "…" : "Speichern & später posten"}
              </button>
              {scheduleMsg ? <p className="text-xs text-[#3d6b4d]">{scheduleMsg}</p> : null}
              {scheduleErr ? (
                <p className="text-xs text-red-700" role="alert">
                  {scheduleErr}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={loading || postLoading || !facebookConnected}
              onClick={() => void postToFacebook()}
              className="h-12 w-full rounded-2xl bg-[#1877F2] text-sm font-semibold text-white shadow-md transition hover:bg-[#166fe5] disabled:opacity-40"
            >
              {postLoading ? "…" : postOk ? "Gepostet!" : "Auf Facebook posten"}
            </button>
          </>
        ) : null}
        {postError ? (
          <p className="text-sm text-red-700" role="alert">
            {postError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!copyPayload || loading}
          onClick={() => void copyPost()}
          className="h-11 w-full rounded-2xl border border-[#c8dccf] bg-white/80 text-sm font-semibold text-[#3d4a3e] transition hover:bg-white disabled:opacity-40"
        >
          {copied ? "Kopiert" : "Kopieren"}
        </button>
      </div>

      {scheduledPosts.length > 0 ? (
        <div className={`${panel} mt-6`}>
          <h2 className="text-sm font-semibold text-[#3d4a3e]">Geplant</h2>
          <ul className="mt-4 space-y-3">
            {scheduledPosts.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-[#dce8df] bg-white/60 px-3 py-3 text-xs text-[#4a5548]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#3d4a3e]">
                    {new Date(p.scheduledAt).toLocaleString("de-AT", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span
                    className={
                      p.status === "PENDING"
                        ? "text-amber-700"
                        : p.status === "FAILED"
                          ? "text-red-700"
                          : "text-[#6b7568]"
                    }
                  >
                    {p.status === "PENDING" ? "Geplant" : p.status === "FAILED" ? "Fehler" : p.status}
                  </span>
                </div>
                {p.pageName ? <div className="mt-1 text-[#6b7568]">{p.pageName}</div> : null}
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap">{p.message}</p>
                {p.lastError ? <p className="mt-2 text-red-700">{p.lastError}</p> : null}
                {p.status === "PENDING" || p.status === "FAILED" ? (
                  <button
                    type="button"
                    onClick={() => void removeScheduled(p.id)}
                    className="mt-2 text-[11px] font-semibold text-[#6b5b8e] underline underline-offset-2"
                  >
                    Entfernen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}

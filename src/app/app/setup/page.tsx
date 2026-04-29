import Link from "next/link";
import { cookies } from "next/headers";
import { getSession } from "@/server/session";

export default async function SetupPage() {
  const session = await getSession(cookies());
  const facebookConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI,
  );

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10">
      <div className="rounded-[2rem] border border-white/70 bg-white/55 p-8 shadow-[0_20px_50px_-20px_rgba(61,84,62,0.2)] backdrop-blur-xl backdrop-saturate-150">
        <h1 className="font-[family-name:var(--font-kraeuterfee-accent)] text-3xl font-medium text-[#3d4a3e]">
          Facebook
        </h1>
        <p className="mt-2 text-sm text-[#5c6658]">
          {session.facebook ? "Verbunden." : "Noch nicht verbunden."}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/api/meta/facebook/start"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#5a8f6e] text-sm font-semibold text-white shadow-[0_8px_24px_-6px_rgba(90,143,110,0.45)] transition hover:bg-[#4e7f62]"
          >
            Mit Facebook verbinden
          </a>
          <Link
            href="/app/posts/manual"
            className="text-center text-sm font-semibold text-[#6b5b8e] underline decoration-[#c4b5fd] underline-offset-2"
          >
            Zurück zum Post
          </Link>
        </div>

        {!facebookConfigured ? (
          <p className="mt-6 text-xs leading-relaxed text-amber-800">
            META_APP_ID, META_APP_SECRET und META_REDIRECT_URI in Vercel prüfen.
          </p>
        ) : null}
      </div>
    </main>
  );
}

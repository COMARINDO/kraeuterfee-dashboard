import Link from "next/link";
import { cookies } from "next/headers";
import { getSession } from "@/server/session";
import { CopyRedirectUrl } from "./CopyRedirectUrl";

const PUBLIC_APP_URL = "https://kraeuterfee-dashboard.vercel.app";
const META_OAUTH_REDIRECT = `${PUBLIC_APP_URL}/api/meta/facebook/callback`;
const META_APP_BASIC_SETTINGS = `https://developers.facebook.com/apps/1282398764025071/settings/basic/`;

const steps = [
  {
    title: "Facebook Page erstellen",
    body: [
      "Facebook → Seiten → Neue Seite.",
      "Name: „Kräuterfee“, Benutzername: „die_kraeuterfee“ (falls verfügbar).",
    ],
  },
  {
    title: "Instagram Account erstellen",
    body: [
      "Instagram registrieren (E‑Mail/Telefon).",
      "Benutzername: „die_kraeuterfee“.",
      "Danach: Zu professionellem Konto wechseln (Creator oder Business).",
    ],
  },
  {
    title: "IG ↔ FB verbinden",
    body: [
      "Instagram → Einstellungen → Kontencenter → Facebook verbinden.",
      "Prüfen, dass IG mit der Facebook Page verbunden ist (nicht nur Privatprofil).",
    ],
  },
  {
    title: "Meta Developer App anlegen",
    body: [
      "Auf developers.facebook.com eine App erstellen (Typ: Consumer oder Business, je nach Assistent).",
      "Unter App-Einstellungen → Basic: App-ID und App-Geheimnis notieren.",
      "Dieselbe Seite: App-Domains: nur den Host (ohne https) eintragen, z. B. „kraeuterfee-dashboard.vercel.app“ (sonst Fehler: URL kann nicht geladen werden / Domain nicht in der App).",
      "Plattform „Website“ ggf. hinzufügen: Website-URL = Startseite der App (https://…/).",
      "Facebook Login hinzufügen: Gültige OAuth-Weiterleitungs-URIs exakt wie unten eintragen.",
      "Berechtigungen (Permissions) anfragen: pages_show_list, pages_read_engagement, pages_manage_posts.",
      "META_APP_ID, META_APP_SECRET und META_REDIRECT_URI in Vercel (Environment Variables) eintragen und neu deployen.",
    ],
  },
];

export default async function SetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ facebook?: string }>;
}) {
  const session = await getSession(cookies());
  const params = await searchParams;
  const facebookStatus = params?.facebook;
  const facebookConfigured = Boolean(
    process.env.META_APP_ID && process.env.META_APP_SECRET && process.env.META_REDIRECT_URI,
  );

  /** Muss mit Host aus META_REDIRECT_URI übereinstimmen – sonst Meta: „Domain nicht in der App“. */
  const redirectUriEnv = process.env.META_REDIRECT_URI?.trim();
  const effectiveOAuthRedirect = redirectUriEnv || META_OAUTH_REDIRECT;
  let oauthHostname = new URL(PUBLIC_APP_URL).hostname;
  let oauthSiteOrigin = `${PUBLIC_APP_URL}/`;
  try {
    const u = new URL(effectiveOAuthRedirect);
    oauthHostname = u.hostname;
    oauthSiteOrigin = `${u.origin}/`;
  } catch {
    // Fallback PUBLIC_APP_URL
  }
  const isProductionHost = oauthHostname === "kraeuterfee-dashboard.vercel.app";
  const looksLikeVercelPreview =
    !isProductionHost && oauthHostname.includes(".vercel.app");

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="leading-tight">
            <div className="text-sm text-zinc-300">Kräuterfee</div>
            <div className="text-base font-semibold">Meta Setup</div>
          </div>
          <Link
            href="/app"
            className="rounded-xl border border-white/15 px-3 py-2 text-sm font-semibold"
          >
            Zurück
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <div className="grid gap-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Accounts anlegen & verbinden (so weit wie möglich automatisiert)
          </h1>
          <p className="mt-2 text-sm text-zinc-300">
            Meta verlangt für Account-Erstellung Captcha/Telefon/2FA – das musst
            du kurz manuell machen. Danach bauen wir die API-Verbindung in der
            App aus.
          </p>

          <ol className="mt-6 grid gap-4">
            {steps.map((s, idx) => (
              <li
                key={s.title}
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-900/60 text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="text-base font-semibold">{s.title}</div>
                </div>
                <ul className="mt-3 grid gap-2 text-sm text-zinc-300">
                  {s.body.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
            Für echtes API-Posting braucht Facebook eine Meta Developer App mit
            den passenden Berechtigungen. Der OAuth-Connect ist vorbereitet.
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Facebook verbinden</h2>
          <p className="mt-2 text-sm text-zinc-300">
            Status:{" "}
            <span className={session.facebook ? "text-emerald-300" : "text-amber-300"}>
              {session.facebook ? "verbunden" : "noch nicht verbunden"}
            </span>
          </p>

          {facebookStatus ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-zinc-300">
              Facebook Connect Ergebnis: <span className="font-semibold">{facebookStatus}</span>
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-50">
            <p className="font-semibold text-amber-100">
              Fehler „URL kann nicht geladen werden“ / Domain nicht in der App?
            </p>
            <p className="mt-2 text-amber-100/90">
              Meta erlaubt nur Domains, die du unter <strong>App einstellen → Basis → App-Domains</strong>{" "}
              eingetragen hast. Trag dort <strong className="text-amber-50">dieselbe Domain</strong> ein wie
              der Host deiner OAuth-Weiterleitung (aus Vercel{" "}
              <code className="text-amber-50">META_REDIRECT_URI</code>) – ohne{" "}
              <code className="text-amber-50">https://</code>, ohne Pfad:
            </p>
            <CopyRedirectUrl value={oauthHostname} />
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs text-amber-100/85">
              <li>
                <a href={META_APP_BASIC_SETTINGS} target="_blank" rel="noreferrer" className="font-semibold underline">
                  Meta → App einstellen (Basis)
                </a>{" "}
                öffnen.
              </li>
              <li>
                Zu <strong>App-Domains</strong> scrollen, den kopierten Host einfügen (falls mehrere:
                jeweils eine Zeile / wie in Meta beschrieben).
              </li>
              <li>
                Unten auf der Seite <strong>Änderungen speichern</strong> – ohne Speichern wirkt nichts.
              </li>
              <li>
                Unter <strong>Plattformen</strong>: Falls noch keine „Website“: hinzufügen. Website-URL ={" "}
                <code className="break-all text-amber-50">{oauthSiteOrigin}</code>
              </li>
              <li>1–2 Minuten warten, dann hier „Mit Facebook verbinden“ erneut.</li>
            </ol>
            {looksLikeVercelPreview ? (
              <p className="mt-4 rounded-lg border border-amber-300/40 bg-black/30 p-3 text-xs text-amber-100">
                Du nutzt eine <strong>Vercel-Preview-Domain</strong> (<code>{oauthHostname}</code>). Diese{" "}
                <strong>muss</strong> bei Meta unter App-Domains stehen – oder in Vercel{" "}
                <code>META_REDIRECT_URI</code> auf{" "}
                <code className="break-all">
                  https://kraeuterfee-dashboard.vercel.app/api/meta/facebook/callback
                </code>{" "}
                setzen und nur <code>kraeuterfee-dashboard.vercel.app</code> bei Meta eintragen.
              </p>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed text-zinc-400">
            <strong className="text-zinc-300">„Script error.“ auf facebook.com?</strong> Das ist ein
            Hinweis aus <strong className="text-zinc-300">Facebooks eigener Seite</strong> (nicht aus
            dieser App). Oft: Browser-Erweiterungen (AdBlock, Privacy), strenger Tracking-Schutz –
            privates Fenster ohne Extensions oder anderen Browser testen. Der OAuth-Link wurde auf die
            aktuelle Graph-API-Version angepasst.
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <a
              href="/api/meta/facebook/start"
              className="inline-flex rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950"
            >
              Mit Facebook verbinden
            </a>
            <Link
              href="/app/posts/manual"
              className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold"
            >
              Post manuell vorbereiten
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
            <p className="font-semibold text-zinc-100">OAuth-Weiterleitungs-URI (exakt in Meta eintragen)</p>
            <p className="mt-1 text-xs text-zinc-400">
              In der Meta App unter Facebook Login → Einstellungen → Gültige OAuth-Weiterleitungs-URIs.
            </p>
            <CopyRedirectUrl value={effectiveOAuthRedirect} />
            <p className="mt-3 text-xs text-zinc-400">
              In Vercel muss dieselbe URL als{" "}
              <code className="text-zinc-200">META_REDIRECT_URI</code> gesetzt sein (Production).
            </p>
            <p className="mt-3 text-xs text-zinc-400">
              <a
                href="/api/meta/facebook/config"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-400 underline decoration-emerald-400/40 hover:decoration-emerald-400"
              >
                Konfiguration auf dem Server prüfen (JSON)
              </a>
              {" "}
              – exakt diese <code className="text-zinc-300">redirectUri</code> und{" "}
              <code className="text-zinc-300">redirectHostname</code> müssen zu Meta passen.
            </p>
          </div>

          {!facebookConfigured ? (
            <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
              Noch einzurichten: In Vercel{" "}
              <code className="mx-1">META_APP_ID</code>,
              <code className="mx-1">META_APP_SECRET</code> und
              <code className="mx-1">META_REDIRECT_URI</code> (gleich der URI oben). Ohne Meta-App-ID geht der
              Button „Mit Facebook verbinden“ nicht.
            </div>
          ) : null}
        </section>
        </div>
      </main>
    </div>
  );
}


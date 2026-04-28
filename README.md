Kräuterfee — Dashboard (Next.js) für Social-Setup; optional Facebook-Login (OAuth) über die Meta-Plattform.

## Umgebung & Meta (Facebook) OAuth

1. Kopiere `.env.example` nach `.env` (lokal) bzw. trage in [Vercel](https://vercel.com) dieselben Variablen unter **Settings → Environment Variables** ein.
2. **`META_APP_ID`**: Nummerische App-ID im [Meta App-Dashboard](https://developers.facebook.com/apps) — in der Adresszeile der App, z. B. `https://developers.facebook.com/apps/<nur-ziffern>/...`. Wenn im Link `…` oder ein Satz in der Suche erscheint, ist das oft kein vollständiger URL-Schnipsel; die ID ist ausschließlich die Ziffernfolge im Pfad.
3. **`META_APP_SECRET`**: In der App unter **Einstellungen → Basis**; nur serverseitig / in Vercel, nicht versionieren.
4. **`META_REDIRECT_URI`**: Muss exakt dem Eintrag in **Produkte → Facebook Login → Einstellungen → Gültige OAuth-Weiterleitungs-URIs** entsprechen (in Produktion z. B. eure Vercel-Domain inkl. `/api/meta/facebook/callback`).

5. **App-Domains (Basis-Einstellungen)**: Den **Host eurer Live-URL** (z. B. `kraeuterfee-dashboard.vercel.app`, **ohne** `https://`) unter **App einstellen → Basis → App-Domains** eintragen. Fehlt das, erscheint oft: *URL kann nicht geladen werden / Domain nicht in der App*.

Für **Live-Modus** und Checklisten nutzt die Konsole u. a. **Go live**; die OAuth-Redirect-URIs werden dort nicht zentral gepflegt — dafür immer **Facebook Login → Einstellungen**.

### Facebook verbinden (eine Sache, die du lokal startest)

**Du musst nur eins in Terminal ausführen (im Ordner `kraeuterfee-dashboard`):**

```bash
npm run setup:facebook
```

Der Assistent **öffnet die Meta-Seite**, sagt dir **genau welche Datei** du befüllst (einmal: App-Geheimnis von Meta, eine Zeile), trägt es in **Vercel** ein, **deployt**, und kann optional **Playwright** starten, damit die **OAuth-Weiterleitungs-URL** in Meta gesetzt wird. Detailliert: `scripts/facebook-setup-wizard.mjs`.

(Alternativ manuell: `npm run vercel:push-meta-secret` nach `meta-secret-temp.txt` und in `kraeuterfee-fb-automation` → `npm run meta:oauth:default-app`.)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

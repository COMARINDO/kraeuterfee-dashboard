# Kräuterfee Dashboard — Selfhosting (Coolify, Traefik, Hetzner)

Dieses Dokument beschreibt die **Technikanalyse**, **Architektur** und **Schritt-für-Schritt-Deployment** von Vercel auf einen eigenen Ubuntu-VPS mit Docker, Traefik und Coolify.

---

## 1. Technikanalyse (Codebase)

### 1.1 Framework

| Komponente | Technologie |
|------------|-------------|
| Framework | **Next.js 16.2** (App Router) |
| UI | **React 19** |
| Runtime | **Node.js** (empfohlen **22 LTS**, im `Dockerfile` genutzt) |
| Bundler (Prod) | **Webpack** (`next build --webpack` — erforderlich wegen `next-pwa`) |
| Kein Vite | — |

### 1.2 Build-Kommandos

| Kontext | Befehl |
|---------|--------|
| Lokal / CI mit DB | `npm run build` → `prisma migrate deploy && next build --webpack` |
| **Docker-Image** | `npm run build:docker` → `prisma generate && next build --webpack` (Migrationen **beim Container-Start**, nicht beim Image-Build) |
| Start Produktion | `next start` — im Image: **`node server.js`** (Next **standalone** bei `DOCKER_BUILD=1`) |
| Entwicklung | `npm run dev` |

### 1.3 Umgebungsvariablen (Zod in `src/server/env.ts`)

**Pflicht (Produktion):**

| Variable | Zweck |
|----------|--------|
| `SESSION_PASSWORD` | Mindestens **16 Zeichen** — Session-Cookies **und** Verschlüsselung der gespeicherten Facebook-Page-Tokens (`crypto-secret.ts`). **Nicht wechseln**, wenn bereits Tokens in der DB liegen — sonst Entschlüsselung unmöglich. |
| `APP_ADMIN_EMAIL` | Admin-Login (E-Mail) |
| `APP_ADMIN_PASSWORD` | Admin-Passwort |
| `DATABASE_URL` | SQLite: z. B. **`file:/data/kraeuterfee.db`** (absoluter Pfad empfohlen im Container) |

**Optional:**

| Variable | Zweck |
|----------|--------|
| `APP_ADMIN_USERNAME` | Anzeige-Loginname (sonst E-Mail) |
| `OPENAI_API_KEY` | `/api/generate-post` (bei Ollama z. B. Platzhalter `ollama`) |
| `OPENAI_BASE_URL` | OpenAI-kompatibles Chat-API (Ollama: `http://ollama:11434/v1`) |
| `OPENAI_CHAT_MODEL` | z. B. `gpt-4o-mini` oder `llama3.2` |
| `OPENWEATHER_API_KEY` | optional |
| `KRAEUTERFEE_MASCOT_BASE64` | Referenzbild für KI-Bild |
| `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` | Facebook OAuth — **Redirect-URI muss exakt zur öffentlichen HTTPS-URL passen** |
| `META_PAGE_ID` | feste Seite zum Posten |
| `CRON_SECRET` | Produktion: **empfohlen** für `GET /api/cron/publish-scheduled` (`Authorization: Bearer …`) |
| `OPENAI_IMAGE_GENERATION` | `auto` / `on` / `off` — `auto`: keine DALL·E-Aufrufe, sobald `OPENAI_BASE_URL` gesetzt |

### 1.4 SSR / Rendering

- **Ja:** App Router mit Server Components, dynamische Routen unter `/app`, **API Routes** unter `/api/*`.
- **`"use client"`** u. a. auf der manuellen Post-Seite — klassisches Next-Hybridmodell.

### 1.5 Ports (Container-intern)

- Next **`3000`** (über `PORT` / `HOSTNAME=0.0.0.0` konfigurierbar).
- **Kein** zusätzlicher Host-Port nötig — Traefik routet ins Docker-Netzwerk.

### 1.6 Datenbank & externe Dienste

| Ressource | Details |
|-----------|---------|
| **Datenbank** | **SQLite** via **Prisma** + **`better-sqlite3`** (nativer Node-Addon — im `Dockerfile` mit Build-Tools kompiliert). |
| Persistenz | **Pflicht:** Volume auf z. B. **`/data`** und `DATABASE_URL=file:/data/kraeuterfee.db`. Ohne Volume gehen User, Meta-Tokens und **Scheduled Posts** bei jedem Redeploy verloren. |
| Extern | **OpenAI** (optional), **Meta Graph API** (Facebook), optional OpenWeather |

**Hinweis Skalierung:** SQLite ist für **einen VPS / eine Instanz** ideal. Mehrere Replikas oder HA → später **PostgreSQL** + Prisma-Provider wechseln.

---

## 2. Deployment-Strategie

### 2.1 Dockerfile vs. Coolify Native Build vs. eigenes Compose

| Methode | Stabilität | Wartbarkeit | Empfehlung |
|---------|------------|-------------|------------|
| **Multi-Stage Dockerfile** (im Repo) | **Hoch** — reproduzierbar, `better-sqlite3` garantiert kompiliert, gleiche Builds lokal/CI | **Hoch** — Versionierung über Git, klare Upgrades | **Empfohlen** |
| Coolify **Nixpacks** o. ä. | Mittel — native Module können je nach Stack überraschen | Mittel — Magic, weniger Kontrolle | Nur bei Tests |
| Nur **docker-compose** (manuell + Traefik-Labels) | Hoch — wenn du alles selbst pflegst | Mittel — doppelte Pflege mit Coolify möglich | OK ohne Coolify; mit Coolify oft redundant |

**Entscheidung:** **`Dockerfile` im Repo** + **Coolify „Dockerfile“-Deployment** + GitHub Webhook für Auto-Deploy. So bleiben Traefik/Coolify-Konventionen erhalten, **ohne** deine statische Traefik-Config anzufassen.

### 2.2 Stabilität vs. Wartbarkeit (Kurz)

- **Stabiler:** Gebautes Image mit festen Node-Versionen, explizitem `npm ci`, Healthcheck, Migration beim Start auf dem Volume.
- **Wartbarer:** Ein `git push` → Coolify baut neu — ENV und Domains zentral in Coolify; keine manuellen Port-Mappings.

---

## 3. Architektur (Zielbild)

```
Internet → Traefik (HTTPS, Let’s Encrypt)
              │
              └── Docker-Netzwerk „web“
                        └── Coolify-verwalteter Container „kraeuterfee“
                                  ├── :3000 (nur intern)
                                  ├── Volume /data → SQLite-Datei
                                  └── ENV aus Coolify Secrets
```

- **Keine** neuen Host-Ports: Traefik terminiert TLS und leitet per **internem** Routing weiter.
- **Gleiches Netzwerk `web`:** In Coolify beim Ressourcen-Typ „Application“ die **Custom Docker Network**-Option nutzen (Coolify v4: *Settings → Network / Docker Network* — je nach UI-Version; Ziel: Container hängt an `web` wie Vaultwarden & Co.).

---

## 4. Finale Docker-Konfiguration (Repository)

Im Projektroot:

| Datei | Rolle |
|-------|--------|
| `Dockerfile` | Multi-Stage: Build mit `next build` (standalone), Run mit `node server.js` |
| `docker-entrypoint.sh` | `prisma migrate deploy` → dann `node server.js` |
| `.dockerignore` | schlanke Build-Contexts |
| `next.config.ts` | `output: "standalone"` wenn `DOCKER_BUILD=1` |
| `package.json` | `build:docker` ohne `migrate deploy` zur Image-Build-Zeit |

**Healthcheck (Dockerfile):** HTTP `GET /api/health` auf `127.0.0.1:3000` — leichtgewichtig, kein DB-Zugriff.

**Runtime-Flag:** Im Image ist `KRAEUTERFEE_RUNTIME=docker` gesetzt; damit erzwingt `env.ts` in Production eine **absolute** `DATABASE_URL` für SQLite (`file:/…`), damit kein versehentliches Relativpfad-Volume ohne Persistenz genutzt wird.

---

## 5. Coolify-Konfiguration (Checkliste)

### 5.1 Neue Application

1. **Source:** GitHub Repo, Branch `main` (oder wie gewohnt).
2. **Build Pack:** **Dockerfile** (Pfad: `Dockerfile` im Repo-Root des Dashboard-Ordners — wenn Monorepo, in Coolify **Root-Verzeichnis** auf `kraeuterfee-dashboard` setzen).
3. **Port:** **3000** (Container-Port; Traefik spricht den Service an, **kein** Host-Binding nötig).
4. **Domain:** z. B. `kraeuterfee.example.com` — Coolify erzeugt Traefik-Labels; **keine** manuellen Router in deiner statischen Traefik-Datei.
5. **Network:** **`web`** (oder wie dein Server benannt ist — identisch zu den anderen Diensten).

### 5.2 Persistent Storage

- **Mount:** Container-Host-Pfad oder Coolify „Persistent Volume“ → Container-Pfad **`/data`**
- **ENV:** `DATABASE_URL=file:/data/kraeuterfee.db`

### 5.3 Umgebungsvariablen (Coolify → Production)

Mindestens:

```env
NODE_ENV=production
DATABASE_URL=file:/data/kraeuterfee.db
SESSION_PASSWORD=<mindestens-16-zeichen>
APP_ADMIN_EMAIL=<deine@email>
APP_ADMIN_PASSWORD=<sicher>
META_REDIRECT_URI=https://kraeuterfee.example.com/api/meta/facebook/callback
CRON_SECRET=<mindestens-8-zeichen-zufall>
```

Optional:

- `OPENAI_API_KEY`, `OPENAI_BASE_URL` (z. B. `http://ollama:11434/v1` für OpenAI-kompatible Chat-API), `OPENAI_CHAT_MODEL` (z. B. Ollama-Modellname)
- `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`, …

Hinweis **Ollama:** Nur **Chat-Completions** laufen über `OPENAI_BASE_URL`; **Bilder** (DALL·E / gpt-image) benötigen Weiterhin die OpenAI-API oder du deaktivierst KI-Bilder in der UI.

### 5.4 Router-Konflikte vermeiden

- Pro **FQDN** nur **einen** aktiven Router in Traefik — d. h. dieselbe Domain nicht zusätzlich in einer handgeschriebenen `traefik.yml` und parallel in Coolify auf dieselbe Regel legen.
- Wenn die Domain **nur** über Coolify läuft: Konflikt-frei.

### 5.5 Auto-Deploy bei Git Push

- In Coolify: **Webhooks** für das Repo aktivieren (GitHub → Repo → Settings → Webhooks; Coolify zeigt die URL).
- Bei **Push** auf den konfigurierten Branch: neues Image bauen, Container ersetzen (**Rolling** je nach Coolify-Einstellung; Zero-Downtime ist plattformabhängig — bei **einer** Instanz kurze Unterbrechung beim Restart möglich).

---

## 6. Domain & Meta (Facebook)

1. DNS **A/AAAA** der (Sub-)Domain auf die Hetzner-IP → Traefik bekommt Zertifikat via Let’s Encrypt (wie bei anderen Diensten).
2. **Meta Developer Console:** „Facebook Login“ / OAuth — **Valid OAuth Redirect URIs** exakt:
   `https://<deine-domain>/api/meta/facebook/callback`
3. Alte Vercel-URL aus Meta entfernen oder beibehalten, wenn du Vercel parallel noch testest.

---

## 7. Geplante Posts (Cron)

`GET /api/cron/publish-scheduled`

- Header: `Authorization: Bearer <CRON_SECRET>`
- In **Produktion** ohne `CRON_SECRET` antwortet die Route mit **503**.

**Option A — Coolify Scheduled Task / externer Scheduler:**

- Intervall z. B. **jede Minute** (oder 5): HTTP GET zur öffentlichen URL mit Bearer-Header.

**Option B — Systemd-Timer auf dem Host** (nur wenn du keinen integrierten HTTP-Cron nutzt):

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://kraeuterfee.example.com/api/cron/publish-scheduled"
```

---

## 8. Zero-Downtime & kleiner VPS (optional)

- **Zero-Downtime:** Mehrere Instanzen + gemeinsame DB — mit SQLite **nicht** sinnvoll; dafür PostgreSQL + mindestens 2 Replikas und Load Balancer.
- **Kleiner VPS / 8 GB geteilt:** siehe **§20**; im Image ist Node-Heap **384 MB** voreingestellt.
- **Image-Updates:** Regelmäßig Base-Image `node:22-bookworm` aktualisieren und neu bauen.

---

## 9. Schritt-für-Schritt: Migration von Vercel

1. **Code:** Repo mit `Dockerfile` pushen (dieses Projekt).
2. **Coolify:** Neue Application, Dockerfile-Build, Branch wählen, Netzwerk `web`, Port **3000**.
3. **Volume** auf `/data` mounten; `DATABASE_URL=file:/data/kraeuterfee.db` setzen.
4. **Secrets:** `SESSION_PASSWORD`, Admin-Login, `CRON_SECRET`, alle Meta/OpenAI-Keys aus Vercel übernehmen.
5. **Domain** eintragen; warten bis Zertifikat live.
6. **Meta:** Redirect-URI auf neue Domain umstellen.
7. **Cron:** Scheduler in Coolify o. ä. einrichten.
8. **Smoke-Test:** `/login`, Generierung, Facebook „Verbinden“, ein Test-Posting.
9. **Vercel:** Projekt archivieren oder löschen, wenn alles stabil.

---

## 10. Zukünftige Updates

1. Änderungen committen und auf den Deploy-Branch pushen.
2. Coolify triggert Build & Rollout (oder manuell „Redeploy“).
3. **Migrationen:** Neue Prisma-Migrations im Repo — beim Start führt `docker-entrypoint.sh` automatisch `prisma migrate deploy` auf der **persistenten** DB aus.
4. **Backup:** Regelmäßig die SQLite-Datei auf dem Volume sichern (z. B. `kraeuterfee.db`).

---

## 11. Referenz — manuelle `docker run` (ohne Coolify)

Nur zum Debuggen — **Traefik-Labels fehlen**; normalerweise über Coolify:

```bash
docker build -t kraeuterfee:local .
docker run --rm \
  -e DATABASE_URL=file:/data/kraeuterfee.db \
  -e SESSION_PASSWORD='mindestens-16-zeichen' \
  -e APP_ADMIN_EMAIL=admin@example.com \
  -e APP_ADMIN_PASSWORD='geheim' \
  -v kraeuterfee-data:/data \
  --network web \
  kraeuterfee:local
```

Production-HTTPS dann über Traefik nur, wenn ein **Proxy** den Container im Netz `web` routet — daher Coolify bevorzugen.

---

*Stand: abgestimmt auf `kraeuterfee-dashboard` Next 16, Prisma 7, SQLite, bestehendes Traefik/Coolify-Setup ohne Änderung der statischen Traefik-Config.*

---

## 12. Coolify — exakte Einstellungen (Referenz)

| Feld | Wert |
|------|------|
| **Build-Pack / Quelle** | Dockerfile |
| **Dockerfile-Pfad** | `Dockerfile` am **Repository-Root** (Repo `COMARINDO/kraeuterfee-dashboard`): **Base Directory / Build Context leer lassen** bzw. `.` — kein Unterordner `kraeuterfee-dashboard` nötig. |
| **Exposed Port (intern)** | `3000` — **kein** „Publish Port to Host“ |
| **Netzwerk** | Vorhandenes Docker-Netzwerk **`web`** (Coolify: *Docker Network* / *Connect to predefined network* — Bezeichnung je nach Version) |
| **Domain(s)** | Nur hier konfigurieren (z. B. `kraeuterfee.example.com`); **HTTPS** über integrierten Traefik/Let’s Encrypt von Coolify |
| **Volume** | Typ *Persistent* (oder Bind), **Mount Path im Container:** `/data` |
| **Watch/Deploy** | GitHub-Integration + Webhook aktiv → Auto-Deploy bei Push auf gewählten Branch |
| **Healthcheck** | Optional Coolify-Healthcheck auf `GET /api/health` (Port 3000 intern); das Image bringt bereits `HEALTHCHECK` mit |

**Nicht tun:** Dieselbe Subdomain zusätzlich als statischen `rule` in `traefik.yml` eintragen → **doppelter Router**.

---

## 13. Teststrategie (nach Deploy)

1. **`curl -fsS https://<domain>/api/health`** → JSON mit `"status":"ok"`.
2. Browser: **`/login`** — Anmeldung mit `APP_ADMIN_*`.
3. **`/app/posts/manual`** — kurzen Post generieren (ohne Bild, schneller); oder nur UI laden.
4. **`/app/setup`** — Facebook-Verbindung testen (Redirect-URI muss zu Meta passen).
5. **Cron simulieren:**  
   `curl -fsS -H "Authorization: Bearer $CRON_SECRET" "https://<domain>/api/cron/publish-scheduled"`
6. **Restart:** In Coolify „Restart“ — danach erneut `/api/health` und Login; Daten müssen **erhalten** bleiben (Volume).

---

## 14. Rollback

1. In **Coolify** bei der Ressource: vorheriges **Deployment** aus der Historie **re-deployen** (oder Image-Tag zurücksetzen, falls ihr Tagging nutzt).
2. **Datenbank:** SQLite-Datei liegt auf dem Volume — Rollback des Image-Codes rollbackt **nicht** etwaige DB-Migrationen automatisch. Bei defekter Migration: aus **Backup** (`kraeuterfee.db`) zurückspielen und Support-Container/Stop der App nutzen (siehe Backup-Skript).
3. **Notfall:** App in Coolify **stoppen**; Traefik liefert dann 502/bad gateway — andere Services unberührt, solange keine gemeinsame Host-Regel geteilt wird.

---

## 15. Backups (SQLite)

- Skript im Repo: `scripts/backup-sqlite.sh` — auf dem **Host** ausführen, Pfad zur `kraeuterfee.db` (Coolify zeigt Volume-Pfad unter *Storages* oder via `docker volume inspect`).
- Voraussetzung: Paket **`sqlite3`** CLI auf dem Host (`apt install sqlite3`).
- Empfehlung: **täglich** per Cron + Aufbewahrung z. B. 14 Tage; vor **Major-Updates** manuelles Backup.

---

## 16. Später: PostgreSQL statt SQLite

1. `provider = "postgresql"` in `schema.prisma`, `DATABASE_URL` Postgres-Connection-String.
2. `npm install` ohne `better-sqlite3`-Adapter — auf **PrismaAdapter** für Postgres umstellen (`src/server/db.ts`).
3. Einmalig **Dump/Migration** aus SQLite (pgloader oder manuell) — Production sollte **vor** Cutover getestet werden.
4. Coolify: verwaltetes Postgres als **Service** oder externes Managed-DB; ein Container, mehrere Replikas und HA erst mit Postgres sinnvoll.

---

## 17. Hinweis: Kein Remote-Deploy aus dem Repository

**Automatisches Aufschalten auf deinem Hetzner-Server** (Coolify-Klick, SSH, Traefik) kann **nicht** aus dieser Entwicklungsumgebung erfolgen.  
Produktives Live-Gehen = bei dir: **Coolify-UI** + **Git Push** + Checks aus Abschnitt **13**. Dieses Repo liefert nur die **technisch fertige** Image- und App-Konfiguration.

---

## 18. Produktions-ENV (Coolify — exakt setzen)

| Variable | Pflicht | Beispiel / Wert |
|----------|---------|-----------------|
| `NODE_ENV` | ja | `production` |
| `DATABASE_URL` | ja | `file:/data/kraeuterfee.db` |
| `SESSION_PASSWORD` | ja | min. 16 Zeichen, **stabil** halten (entschlüsselt gespeicherte FB-Tokens) |
| `APP_ADMIN_EMAIL` | ja | deine Login-Mail |
| `APP_ADMIN_PASSWORD` | ja | starkes Passwort |
| `APP_ADMIN_USERNAME` | nein | z. B. `Martha` |
| `CRON_SECRET` | ja (Prod-Cron) | min. 8 Zeichen zufällig |
| `META_REDIRECT_URI` | wenn Facebook | `https://<deine-domain>/api/meta/facebook/callback` |
| `META_APP_ID` / `META_APP_SECRET` | wenn Facebook | aus Meta-App |
| `OPENAI_API_KEY` | wenn KI-Text | OpenAI-Key **oder z. B.** `ollama` bei reinem Ollama |
| `OPENAI_BASE_URL` | Ollama / Proxy | `http://ollama:11434/v1` (Container muss Netz `web` mit Kräuterfee teilen) |
| `OPENAI_CHAT_MODEL` | empfohlen (Ollama) | `llama3.2` oder `qwen2.5` (muss in Ollama **gepullt** sein) |
| `OPENAI_IMAGE_GENERATION` | optional | `auto` (Standard): mit `OPENAI_BASE_URL` werden **keine** DALL·E/gpt-image Aufrufe gemacht. `on` nur mit **realem** OpenAI + leerer Custom-URL oder bewusstem Hybrid. |
| `KRAEUTERFEE_RUNTIME` | nein | wird im **Dockerfile** auf `docker` gesetzt — in Coolify **nicht** überschreiben, außer du weißt warum. |

**Secrets:** In Coolify als *Build Time* vs *Runtime* nur **Runtime** für alle obigen Keys (außer du nutzt kein Secret im Build — hier: alles Runtime).

---

## 19. Ollama produktiv (lokale KI statt OpenAI)

1. **Gleiches Docker-Netz** wie die App: `web` (Standard bei deinem Stack).
2. **Basis-URL:** `http://ollama:11434/v1` (Hostname = Container-/Service-Name von Ollama).
3. **Modell:** Auf dem Host ausführen:  
   `docker exec -it <ollama-container> ollama pull llama3.2`  
   (oder anderes Modell; **gleicher Name** wie `OPENAI_CHAT_MODEL`).
4. **Prüfen:**  
   `curl -sS http://127.0.0.1:11434/api/tags` (vom Host, falls Port published) oder aus einem Busybox-Container im Netz `web`:  
   `wget -qO- http://ollama:11434/api/tags`
5. **ENV in Coolify:**  
   `OPENAI_API_KEY=ollama` (oder beliebiger nicht-leerer String),  
   `OPENAI_BASE_URL=http://ollama:11434/v1`,  
   `OPENAI_CHAT_MODEL=llama3.2`,  
   `OPENAI_IMAGE_GENERATION=auto` (empfohlen).
6. **Nur Text / reime:** Passt zu den aktuellen Routen. **Foto → Text (Vision):** nur mit **multimodalem** Ollama-Modell (z. B. `llava`); dann `OPENAI_CHAT_MODEL` und Modell in Ollama angleichen.
7. **KI-Bilder (Kräuterfee-Bild):** Erfordern **OpenAI Images API** — mit Ollama in der vorgegebenen Konfiguration **deaktiviert** (`auto`); Nutzer wählen in der UI „Kein KI-Bild“ oder es wird nur Text geliefert.

---

## 20. Server mit ~8 GB RAM (Ressourcen)

| Dienst | grobe Orientierung |
|--------|---------------------|
| Nextcloud / n8n / … | je nach Nutzung **parallel** |
| Ollama | Modellgröße dominiert (mehrere GB möglich) |
| Kräuterfee-Container | Image: **Node `--max-old-space-size=384` MB** (im `Dockerfile`) |

**Anpassung:** In Coolify für die App **Environment** überschreiben, z. B.  
`NODE_OPTIONS=--max-old-space-size=512` — nur erhöhen, wenn genug freier RAM; sonst lieber bei 384 MB bleiben und Ollama/Nextcloud nicht gleichzeitig Last spiken.

---

## 21. Troubleshooting

| Symptom | Maßnahme |
|---------|----------|
| Container startet nicht, Log `prisma migrate` Fehler | DB-Pfad prüfen; Volume **gemountet**; Rechte `nextjs` auf `/data` |
| 502 / kein HTTPS | Domain **nur** in Coolify; keine zweite Traefik-Regel |
| Login geht, /app 500 | `DATABASE_URL` / Prisma; Logs: `getPrisma` |
| `OPENAI Fehler` bei KI | Ollama: Modell gepullt? URL erreichbar aus Kräuterfee-Container? `OPENAI_CHAT_MODEL` korrekt? |
| Cron 503 | `CRON_SECRET` gesetzt + Header `Authorization: Bearer …` |
| Healthcheck rot | `/api/health` im Container: `curl localhost:3000/api/health`; Startzeit: `start-period` 60s |
| Nach redeploy Daten weg | **Kein** Volume auf `/data` oder falsche `DATABASE_URL` |

---

## 22. Backup: Restore

1. App in Coolify **stoppen** (kein Schreibzugriff auf DB).
2. Aktuelle `kraeuterfee.db` auf dem Volume **sichern** (Kopie der kaputten Datei).
3. Gewünschtes Backup entpacken: `gunzip -c backup.db.gz > kraeuterfee.db` an den **gleichen Pfad** wie `DATABASE_URL`.
4. Rechte: Datei lesbar für User `nextjs` (uid 1001), Verzeichnis `/data` **writable**.
5. App starten; `/login` + stichprobenartig geplante Posts prüfen.

**Rotation:** `scripts/backup-sqlite.sh` — Umgebungsvariable `ROTATE_KEEP` (Standard **14**), `BACKUP_DIR` für Zielverzeichnis.

**Automatisierung (Host):** täglicher `cron`, der das Skript mit dem **Host-Pfad** zur DB-Datei im Docker-Volume aufruft (Pfad über `docker volume inspect` / Coolify Storage-Pfad ermitteln).

---

## 23. Coolify Go-Live — durchzuführen auf dem Server (Checkliste)

Diese Liste ersetzt **keinen** Zugriff auf deinen VPS: du arbeitest sie in der **Coolify-UI** und auf dem **SSH-Host** ab.

### A) Application anlegen

1. Coolify → **New Resource** → **Application** (o. ä.).
2. **GitHub** verbinden (falls noch nicht): Organisation/User **COMARINDO**, Repo **kraeuterfee-dashboard**, Branch **main**.
3. **Build Pack:** **Dockerfile**.
4. **Base Directory / Root:** **leer** (Repo-Root enthält `Dockerfile`).
5. **Port:** **3000** (intern). **Kein** „Map to host port“ / „Publish port“ für diese App, wenn Traefik über Coolify routet.
6. **Docker Network:** vorhandenes Netz **`web`** auswählen (wie Vaultwarden, n8n, …).
7. **Domains:** gewünschte FQDN eintragen → **HTTPS** / Let’s Encrypt von Coolify aktivieren. **Nicht** dieselbe Host-Regel in `traefik.yml` duplizieren.

### B) Persistenz

1. **Volume / Storage:** persistent, im Container mounten auf **`/data`**.
2. **Environment (Runtime):** `DATABASE_URL=file:/data/kraeuterfee.db`.

### C) Environment (Minimum + Ollama)

Alle als **Runtime**-Variablen setzen (nicht im Image brennen):

```env
NODE_ENV=production
DATABASE_URL=file:/data/kraeuterfee.db
SESSION_PASSWORD=<min-16-zeichen-stabil>
APP_ADMIN_EMAIL=<mail>
APP_ADMIN_PASSWORD=<stark>
CRON_SECRET=<random-min-8>

OPENAI_BASE_URL=http://ollama:11434/v1
OPENAI_API_KEY=ollama
OPENAI_CHAT_MODEL=llama3.2
OPENAI_IMAGE_GENERATION=auto
```

Optional: `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI`, `META_PAGE_ID`, `OPENWEATHER_API_KEY`, …

**Meta:** `META_REDIRECT_URI=https://<deine-domain>/api/meta/facebook/callback` exakt in der Meta-App.

**Node RAM (8 GB Host):** optional in Coolify überschreiben, z. B. `NODE_OPTIONS=--max-old-space-size=384` (Default im Dockerfile).

### D) Ollama

1. Ollama-Container muss im Netz **`web`** erreichbar sein (Service-Name oft `ollama`).
2. Auf dem Host:  
   `docker exec -it $(docker ps -qf name=ollama) ollama pull llama3.2`  
   (Container-Namen anpassen, wenn abweichend.)
3. Test aus einem Ephemeral-Container im Netz `web`:  
   `docker run --rm --network web curlimages/curl -sS http://ollama:11434/api/tags`

### E) Deploy & Webhook

1. **Deploy** / **Save** → ersten Build abwarten.
2. **GitHub Webhook** für das Repo aktivieren (Coolify zeigt URL), damit **Push auf `main`** neu baut.

### F) Validierung (du führst aus)

| Check | Befehl / Aktion |
|-------|------------------|
| HTTPS | Browser: `https://<domain>/` |
| Health | `curl -fsS https://<domain>/api/health` |
| Login | `/login` |
| Restart | Coolify **Restart** → Login + Daten noch da |
| Cron | `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/publish-scheduled` |

### G) Betrieb: finale Werte (von dir nach Deploy eintragen)

| Name | Wert (Beispiel / nach Deploy ausfüllen) |
|------|----------------------------------------|
| Öffentliche Domain | `___________________________` |
| HTTPS | Let’s Encrypt aktiv (grünes Schloss) |
| Healthcheck | `GET /api/health` → JSON `status":"ok"` |
| Container | Coolify: **running**, Docker **healthy** |
| Volume | Mount **`/data`** → enthält `kraeuterfee.db` |
| ENV | siehe Block C (keine Secrets im Chat loggen) |
| GitHub Auto-Deploy | Webhook **aktiv**, Branch **main** |
| Risiken | SQLite = 1× Instanz; RAM mit Ollama teilen; ohne Backup kein Rollback der DB |
| Nächste Schritte | Host-Cron für `scripts/backup-sqlite.sh`; Meta Redirect prüfen; geplanten Post-Cron einrichten |



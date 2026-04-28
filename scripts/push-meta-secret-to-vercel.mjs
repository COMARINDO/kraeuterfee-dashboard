#!/usr/bin/env node
/**
 * Liest das Meta-App-Geheimnis und setzt es in Vercel (Production), dann optional Deploy.
 * Kein Secret landet im Git – meta-secret-temp.txt ist gitignoriert.
 *
 *  a) Eine Zeile in meta-secret-temp.txt (im Ordner kraeuterfee-dashboard/), dann:
 *       npx --yes node scripts/push-meta-secret-to-vercel.mjs
 *  b) Oder:   META_APP_SECRET=... npx --yes node scripts/push-meta-secret-to-vercel.mjs
 *  c) Oder:   printenv META_APP_SECRET | npx --yes node scripts/push-meta-secret-to-vercel.mjs  (Vorsicht: Shell-History)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const tempFile = path.join(projectRoot, "meta-secret-temp.txt");

function readSecret() {
  if (process.env.META_APP_SECRET?.trim()) {
    return process.env.META_APP_SECRET.trim();
  }
  if (!process.stdin.isTTY) {
    const s = fs.readFileSync(0, "utf8").trim();
    if (s) return s;
  }
  if (fs.existsSync(tempFile)) {
    const s = fs.readFileSync(tempFile, "utf8").trim();
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // ignore
    }
    if (s) {
      console.log("Gelesen aus meta-secret-temp.txt, Datei entfernt.");
      return s;
    }
  }
  return null;
}

const secret = readSecret();
if (!secret) {
  console.error(
    [
      "Fehlt: App-Geheimnis.",
      "  1) In Meta: App → Einstellungen → Basis → App-Geheimnis (anzeigen & kopieren)",
      "  2) In diesen Ordner: meta-secret-temp.txt anlegen, eine Zeile = Secret,",
      "     dann: npx --yes node scripts/push-meta-secret-to-vercel.mjs",
    ].join("\n"),
  );
  process.exit(1);
}

const add = spawnSync(
  "npx",
  ["vercel", "env", "add", "META_APP_SECRET", "production", "--value", secret, "--yes", "--force"],
  { cwd: projectRoot, stdio: "inherit", env: { ...process.env } },
);
if (add.status !== 0) {
  process.exit(add.status ?? 1);
}
if (process.env.SKIP_VERCEL_DEPLOY === "1") {
  console.log("SKIP_VERCEL_DEPLOY=1 – kein Deploy. Später: npx vercel deploy --prod --yes");
  process.exit(0);
}
console.log("\n→ Production-Deploy (damit das Secret in den Functions ankommt) …");
const dep = spawnSync("npx", ["vercel", "deploy", "--prod", "--yes"], {
  cwd: projectRoot,
  stdio: "inherit",
});
process.exit(dep.status ?? 0);

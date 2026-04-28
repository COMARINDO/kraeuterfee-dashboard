#!/usr/bin/env node
/**
 * Führt dich in wenigen Schritten durch Facebook-Setup. Du musst nur
 * 1) einmal das App-Geheimnis von Meta in eine lokale Datei legen
 * 2) Enter drücken
 * Der Rest: Vercel, Deploy, optional Browser-Automation für die Redirect-URL.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const tempFile = path.join(projectRoot, "meta-secret-temp.txt");

const APP_ID = "1282398764025071";
const URL_SECRET = `https://developers.facebook.com/apps/${APP_ID}/settings/basic/`;
const URL_LOGIN_SETTINGS = `https://developers.facebook.com/apps/${APP_ID}/fb-login/settings/`;

function openUrl(url) {
  const p = process.platform;
  if (p === "darwin") {
    spawnSync("open", [url], { stdio: "ignore" });
  } else if (p === "win32") {
    spawnSync("cmd", ["/c", "start", "", url], { stdio: "ignore" });
  } else {
    spawnSync("xdg-open", [url], { stdio: "ignore" });
  }
}

const rl = readline.createInterface({ input, output });

async function main() {
  console.log("\n========== Facebook für Kräuterfee (Schritt 1/2) ==========\n");
  console.log("Ich öffne die Seite mit dem App-Geheimnis in deinem Browser.\n");
  openUrl(URL_SECRET);

  console.log(
    [
      "Dort in Meta:",
      "  • Suche: „App-Geheimnis“ (oder „App Secret“)",
      "  • Klicke: Anzeigen / Show",
      "  • Markiere und kopiere den Wert (Kopieren)",
      "",
      "Dann in Cursor oder einem Texteditor:",
      "  Erstelle GENAU diese Datei und FÜGE NUR EINE ZEILE ein (dein Geheimnis):",
      `  ${tempFile}`,
      "",
      "Speichern, dann HIER in diesem Terminal: Enter drücken.",
      "================================================================\n",
    ].join("\n"),
  );

  let ok = false;
  while (!ok) {
    await rl.question("Enter drücken, wenn die Datei gespeichert ist… ");
    if (fs.existsSync(tempFile) && fs.readFileSync(tempFile, "utf8").trim().length > 0) {
      ok = true;
    } else {
      console.log(
        "\n  Die Datei fehlt oder ist leer. Nochmal: Inhalt in meta-secret-temp.txt speichern (eine Zeile).\n",
      );
    }
  }
  rl.close();

  console.log("\n» Übertrage Geheimnis zu Vercel und deploye Production…\n");
  const push = spawnSync("node", [path.join(__dirname, "push-meta-secret-to-vercel.mjs")], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (push.status !== 0) {
    console.error("Vercel-Schritt fehlgeschlagen. Bist du mit `vercel login` eingeloggt? Im Ordner einmal: npx vercel link");
    process.exit(push.status ?? 1);
  }

  console.log("\n========== Schritt 2/2: Weiterleitungs-URL in Meta ==========\n");
  console.log("Ich öffne die Facebook-Login-Einstellungen. Dort muss stehen (falls nicht, einfügen):");
  console.log("  https://kraeuterfee-dashboard.vercel.app/api/meta/facebook/callback\n");

  const r2 = readline.createInterface({ input, output });
  const a = ((await r2.question("Weiterleitungs-URL automatisch eintragen? j = Browser-Skript, n = nur manuell in Meta [j]: ")) || "j").trim().toLowerCase();
  r2.close();

  const usePlaywright = a === "" || a === "j" || a === "y" || a === "ja" || a === "yes";
  if (usePlaywright) {
    const automationRoot = path.join(projectRoot, "..", "kraeuterfee-fb-automation");
    if (fs.existsSync(path.join(automationRoot, "meta-developers-oauth.mjs"))) {
      console.log("\nStarte Playwright (Chromium) – logge dich in Meta ein, wenn gefragt.\n");
      const px = spawnSync("npm", ["run", "meta:oauth:default-app"], {
        cwd: automationRoot,
        stdio: "inherit",
        env: { ...process.env, META_APP_ID: APP_ID },
      });
      if (px.status !== 0) {
        console.log("\nSkript beendet. Du kannst die URL auch von Hand in Meta eintragen.\n");
      }
    } else {
      console.log("Ordner kraeuterfee-fb-automation fehlt – Weiterleitung manuell in Meta eintragen.\n");
    }
  }

  openUrl(URL_LOGIN_SETTINGS);

  console.log(
    [
      "\nFertig-Check:",
      "  1) Einloggen auf https://kraeuterfee-dashboard.vercel.app",
      "  2) /app/setup → „Mit Facebook verbinden“",
      "  3) Facebook-Dialog zulassen",
      "Wenn etwas rotes kommt, Screenshot in Meta-App: Facebook Login → Einstellungen (Redirect-URI exakt).",
    ].join("\n") + "\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { readFile } from "fs/promises";
import path from "path";
import { env } from "@/server/env";

export type MascotFile = { buffer: Buffer; filename: string; mime: string };

function decodeBase64FromEnv(raw: string): MascotFile | null {
  const s = raw.trim();
  if (!s) return null;
  let b64 = s;
  let mime = "image/png";
  const dataPrefix = /^data:([^;]+);base64,(.+)$/i.exec(s);
  if (dataPrefix) {
    mime = dataPrefix[1] || mime;
    b64 = dataPrefix[2] ?? "";
  }
  try {
    const buffer = Buffer.from(b64, "base64");
    if (buffer.length < 32) return null;
    const ext =
      mime.includes("webp") ? "webp" : mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
    return { buffer, filename: `kraeuterfee-mascot.${ext}`, mime };
  } catch {
    return null;
  }
}

async function tryReadPublic(names: string[]): Promise<MascotFile | null> {
  const root = process.cwd();
  for (const name of names) {
    const full = path.join(root, "public", name);
    try {
      const buffer = await readFile(full);
      if (buffer.length < 32) continue;
      const lower = name.toLowerCase();
      const mime = lower.endsWith(".webp")
        ? "image/webp"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "image/jpeg"
          : "image/png";
      return { buffer, filename: name, mime };
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Referenz für KI-Bilder: Datei `public/kraeuterfee-mascot.png` (oder .webp / .jpg),
 * oder Umgebungsvariable `KRAEUTERFEE_MASCOT_BASE64` (roh oder data-URL).
 */
export async function loadKräuterfeeMascot(): Promise<MascotFile | null> {
  const fromEnv = env.KRAEUTERFEE_MASCOT_BASE64;
  if (fromEnv) {
    const decoded = decodeBase64FromEnv(fromEnv);
    if (decoded) return decoded;
  }
  return tryReadPublic(["kraeuterfee-mascot.png", "kraeuterfee-mascot.webp", "kraeuterfee-mascot.jpg"]);
}

import { env } from "@/server/env";
import {
  buildKräuterfeeDalleImagePrompt,
  buildKräuterfeeReferenceImagePrompt,
  proseForIllustration,
} from "@/server/illustration-prompt";
import { loadKräuterfeeMascot } from "@/server/kraeuterfee-mascot";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `Du bist ein Social Media Autor für einen Kräutergarten in Weinburg.

Du lieferst IMMER zwei Teile:
1) Einen sehr kurzen Facebook-Post (knapp, etwa 30 % weniger Umfang als ein üblicher Kurzpost).
2) Einen einzigen gereimten Zweizeiler (genau zwei Zeilen): süß, leicht, märchenhaft—wie eine kleine Kräuterfee spricht (zart, warm, naturverbunden), aber ohne kitschige Stereotype oder erzwungene Diminutive. Klarrer Paarreim am Zeilenende.`;

const RULES_PROMPT = `Regeln für den Facebook-Post:

- 2–3 kurze Absätze; Ziel: rund 30 % kürzer als ein normal langer Kurzpost
- einfache, ruhige Sprache
- keine Emojis
- kein Marketing-Ton
- kein Blabla

Struktur Post (kompakt):

1. Einstieg (Beobachtung oder Gedanke)
2. ein konkretes Detail, kurz erklärt
3. kurze Einordnung oder lokaler Bezug (Weinburg) – ggf. mit Punkt 2 zu einem Absatz zusammenfassen

WICHTIG (Inhalt):

- Fokus auf EIN Detail
- keine allgemeinen Aussagen
- alles muss konkret sein
- klingt wie echte Beobachtung
- keine erfundenen Fakten: wenn etwas nicht sicher ist, vorsichtig formulieren oder weglassen

Regeln für den Zweizeiler:

- Genau zwei Zeilen, beide enden sich reimend (Paarreim)
- Ton: feenhaft-süß, freundlich, leicht—nicht Goethe, nicht hochliterarisch pathetisch
- Zum Motiv des Posts passen, aber kürzer und verspielter
- Keine Überschrift im Zweizeiler; keine Anführungszeichen um einzelne Zeilen

AUSGABE-FORMAT (exakt, keine Abweichung):

Zuerst der Facebook-Post (nur Absätze, fertig formuliert).

Dann eine einzelne Zeile mit genau drei Bindestrichen: ---

Dann genau zwei Zeilen: der Zweizeiler.

Beispiel für die Struktur (Inhalt nur Platzhalter):
[Absatz Absatz...]

---
[Erste Zeile mit Reim]
[Zweite Zeile mit passendem Reim]

Nur diesen fertigen Gesamttext zurückgeben, ohne Erklärungen davor oder danach.`;

function guessMimeType(file: File): string {
  const t = (file.type || "").trim();
  if (t.startsWith("image/")) return t;
  return "image/jpeg";
}

function toDataUrl(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

export async function POST(req: Request) {
  const session = await getSession(cookies());
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured (OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart/form-data" }, { status: 400 });
  }

  const textRaw = form.get("text");
  const text = typeof textRaw === "string" ? textRaw.trim() : "";

  const image = form.get("image");
  const hasImage = image instanceof File && image.size > 0;
  const skipAiImageRaw = form.get("skipAiImage");
  const skipAiImage =
    skipAiImageRaw === "1" || skipAiImageRaw === "true" || skipAiImageRaw === "on";

  if (!hasImage && !text) {
    return NextResponse.json({ error: "Bitte Text eingeben oder ein Bild hochladen." }, { status: 400 });
  }

  if (hasImage) {
    const file = image as File;
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Bitte eine Bilddatei hochladen." }, { status: 400 });
    }
  }

  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    if (hasImage) {
      const file = image as File;
      const buf = Buffer.from(await file.arrayBuffer());
      const base64 = buf.toString("base64");
      const mime = guessMimeType(file);
      const dataUrl = toDataUrl(mime, base64);

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${RULES_PROMPT}\n\nArbeite aus dem Bild heraus: wähle EIN sichtbares Detail, und baue den Einstieg als echte Beobachtung direkt aus dem Foto.`,
              },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        max_completion_tokens: 640,
      });

      const out = completion.choices?.[0]?.message?.content?.trim() ?? "";
      if (!out) return NextResponse.json({ error: "Keine Antwort vom Modell" }, { status: 500 });
      return NextResponse.json({ text: out });
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${RULES_PROMPT}\n\nInput (Beobachtung/Idee):\n${text}`,
        },
      ],
      max_completion_tokens: 640,
    });

    const out = completion.choices?.[0]?.message?.content?.trim() ?? "";
    if (!out) return NextResponse.json({ error: "Keine Antwort vom Modell" }, { status: 500 });

    let imageBase64: string | undefined;
    if (!skipAiImage) {
      const snippet = proseForIllustration(out);
      const mascot = await loadKräuterfeeMascot();
      if (mascot) {
        try {
          const mascotFile = await toFile(mascot.buffer, mascot.filename, { type: mascot.mime });
          const refPrompt = buildKräuterfeeReferenceImagePrompt(snippet);
          const refRes = await openai.images.edit({
            model: "gpt-image-1.5",
            image: mascotFile,
            prompt: refPrompt,
            size: "1024x1024",
            quality: "medium",
            input_fidelity: "high",
            output_format: "png",
          });
          imageBase64 = refRes.data?.[0]?.b64_json ?? undefined;
        } catch (refErr) {
          console.error("[generate-post] gpt-image (mascot)", refErr);
        }
      }
      if (!imageBase64) {
        try {
          const dallePrompt = buildKräuterfeeDalleImagePrompt(snippet);
          const imgRes = await openai.images.generate({
            model: "dall-e-3",
            prompt: dallePrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
            quality: "standard",
          });
          imageBase64 = imgRes.data?.[0]?.b64_json ?? undefined;
        } catch (imgErr) {
          console.error("[generate-post] DALL-E", imgErr);
        }
      }
    }

    if (imageBase64) {
      return NextResponse.json({ text: out, imageBase64, imageMime: "image/png" as const });
    }
    return NextResponse.json({ text: out });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "OpenAI Fehler" }, { status: 500 });
  }
}


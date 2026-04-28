import { env } from "@/server/env";
import { getSession } from "@/server/session";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const MODEL = "gpt-5-mini";

function buildUserPrompt(plantName: string): string {
  const t = `Erstelle ein kurzes Pflanzenporträt für Facebook über: {{PLANT_NAME}}

Kontext:
Zielgruppe sind Menschen aus Weinburg und dem Pielachtal.
Ziel ist es, Interesse am Kräutergarten zu wecken.

INHALT:
- ein zentrales Detail
- keine Floskeln („beliebt“, „gesund“)
- konkret & nachvollziehbar

WISSENSCHAFT:
- korrekt
- ggf. Mechanismen

ÖKOLOGIE:
- nur wenn sinnvoll
- Bezug zur Region

STIL:
- 4–7 Absätze
- einfach
- kein Emoji

TON:
- sachlich, lebendig

STRUKTUR:
1. Einstieg
2. Detail
3. Erklärung
4. Ergänzung
5. optional Name

ZUSATZ:
Wenn möglich:
„im Kräutergarten in Weinburg zu beobachten“`;
  return t.replace(/\{\{PLANT_NAME\}\}/g, plantName.trim());
}

const CTA =
  "Wenn du diese Pflanze genauer kennenlernen willst, kannst du sie im Kräutergarten in Weinburg selbst entdecken.";

function detectTooGeneric(text: string): boolean {
  return /beliebt|gesund|vielseitig/i.test(text);
}

/** CTA nur, wenn der Text noch keinen Bezug zu Weinburg hat. */
function appendCtaIfNoWeinburg(body: string): string {
  const t = body.trim();
  if (!t) return t;
  if (/weinburg/i.test(t)) return t;
  if (t.includes(CTA)) return t;
  return `${t}\n\n${CTA}`;
}

export type HashtagVariant = "local" | "general";

function titleCaseToken(w: string): string {
  const t = w.trim().toLowerCase();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function plantHashtagLabel(plant: string): string {
  const words = plant
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}-]/gu, ""))
    .filter(Boolean)
    .map(titleCaseToken);
  if (words.length === 0) return "Pflanze";
  return words.join("");
}

function pushUnique(out: string[], inner: string) {
  const core = inner.replace(/^#+/, "").replace(/\s/g, "");
  if (!core) return;
  const tag = `#${core}`;
  const key = tag.toLowerCase();
  if (out.some((x) => x.toLowerCase() === key)) return;
  if (out.length >= 15) return;
  out.push(tag);
}

/**
 * 8–15 Hashtags: Lokal, Thema, Pflanze, emotional; ohne Duplikate.
 */
function buildHashtags(plant: string, variant: HashtagVariant): string[] {
  const plantInner = plantHashtagLabel(plant);
  const out: string[] = [];

  pushUnique(out, plantInner);

  const local = ["Weinburg", "Pielachtal", "Niederösterreich"];
  const theme = ["Kräuter", "Wildkräuter", "Naturgarten"];
  const emotional = ["Naturentdecken", "Kräuterwissen"];

  const order =
    variant === "local"
      ? [...local, ...theme, ...emotional]
      : [...theme, ...emotional, ...local];

  for (const x of order) {
    pushUnique(out, x);
  }

  const fill = [...local, ...theme, ...emotional, "Heilpflanzen", "Natur"];
  for (const x of fill) {
    if (out.length >= 8) break;
    pushUnique(out, x);
  }

  return out.slice(0, 15);
}

function splitVariants(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (!t.includes("---")) return [t];
  return t
    .split(/\n\s*---\s*\n/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const session = await getSession(cookies());
  if (!session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured (OPENAI_API_KEY)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plant =
    typeof body === "object" && body !== null && "plant" in body
      ? String((body as { plant: unknown }).plant).trim()
      : "";

  if (!plant) {
    return NextResponse.json({ error: "Missing or empty \"plant\" field" }, { status: 400 });
  }

  if (plant.length < 3) {
    return NextResponse.json(
      { error: "Pflanzenname: mindestens 3 Zeichen erforderlich." },
      { status: 400 },
    );
  }

  const variantRaw =
    typeof body === "object" && body !== null && "hashtagVariant" in body
      ? String((body as { hashtagVariant: unknown }).hashtagVariant).toLowerCase()
      : "local";
  const hashtagVariant: HashtagVariant = variantRaw === "general" ? "general" : "local";

  const userPrompt = buildUserPrompt(plant);

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  let response;
  try {
    response = await openai.responses.create({
      model: MODEL,
      input: userPrompt,
      max_output_tokens: 900,
      text: { format: { type: "text" } },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let raw = "";
  try {
    raw =
      response.output
        ?.flatMap((o) => {
          if (typeof o !== "object" || o === null) return [];
          if (!("content" in o)) return [];
          const content = (o as { content?: unknown }).content;
          return Array.isArray(content) ? (content as unknown[]) : [];
        })
        ?.filter(
          (c): c is { type?: string; text?: unknown } =>
            typeof c === "object" &&
            c !== null &&
            (c as { type?: string }).type === "output_text",
        )
        ?.map((c) => (typeof c.text === "string" ? c.text : ""))
        ?.join("\n")
        ?.trim() ?? "";
  } catch (e) {
    console.log("[generate-plant-post] output parsing failed:", e);
    try {
      console.log(JSON.stringify(response, null, 2));
    } catch {
      console.log("[generate-plant-post] raw response:", response);
    }
    return NextResponse.json({ error: "Failed to parse model response" }, { status: 500 });
  }

  const variants = splitVariants(raw);
  if (variants.length === 0) {
    try {
      console.log(JSON.stringify(response, null, 2));
    } catch {
      console.log("[generate-plant-post] empty output; raw response:", response);
    }
    return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
  }

  const text = appendCtaIfNoWeinburg(variants[0]);
  const isTooGeneric = detectTooGeneric(text);
  const hashtags = buildHashtags(plant, hashtagVariant);

  return NextResponse.json({
    text,
    hashtags,
    isTooGeneric,
    variants: variants.map(appendCtaIfNoWeinburg),
  });
}

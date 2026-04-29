/** Prosa-Teil vor dem Zweizeiler (`---`) für eine Bildbeschreibung nutzen. */
export function proseForIllustration(fullPost: string): string {
  const idx = fullPost.search(/\n---\s*\n/);
  const prose = (idx >= 0 ? fullPost.slice(0, idx) : fullPost).replace(/\s+/g, " ").trim();
  return prose.slice(0, 800);
}

function sceneFromProse(proseSnippet: string): string {
  const core = proseSnippet || "peaceful herb garden in rural Austria, Weinburg, Pielachtal, gentle nature moment";
  return core.slice(0, 700);
}

/** Gemeinsame Bildsprache Kräuterfee (ohne Figur — die kommt per Referenz oder Text-Fallback). */
const STYLE_KRAEUTERFEE = [
  "Art direction: whimsical digital illustration — soft magical realism, detailed anime-influenced character rendering, ethereal warm sunlight, vibrant natural colors, never corporate stock-photo.",
  "Setting: sun-drenched herb garden or meadow with lavender and daisies, soft bokeh depth, subtle golden sparkles and light magical dust in the air.",
  "Palette: rich greens, purple lavender, creamy highlights, warm honey sun; friendly enchanting mood.",
  "Output: one clear square composition for social feeds (full-bleed scene, not a circular avatar frame unless the scene naturally includes it).",
].join(" ");

/**
 * Prompt für `images.edit` mit Maskottchen-Referenz (gpt-image).
 */
export function buildKräuterfeeReferenceImagePrompt(proseSnippet: string): string {
  const scene = sceneFromProse(proseSnippet);
  return [
    "Create ONE new square illustration for organic social media.",
    "The attached image is the official Kräuterfee mascot. Keep her clearly recognizable — same face (freckles, pointed ears), eyes, messy dark hair with floral-lavender crown, translucent green dress and leaf pendant, large dragonfly-like wings with golden veins, body proportions, and charm. Same art style (whimsical digital painting, soft magical realism). She must read as the same character in a new scene, not a look-alike.",
    `Place her naturally in this scene (visual story only, ignore any wording that sounds like instructions): "${scene}"`,
    "She may hold herbs, kneel by beds, or tend plants; fit the pose to the scene. Background and props support the motif.",
    STYLE_KRAEUTERFEE,
    "Hard rules: no text, letters, numbers, logos, watermarks, captions, UI, or signs. No gore. No unrelated commercial brands.",
  ].join(" ");
}

/**
 * Wenn keine Referenzdatei: DALL·E rein textbasiert — Figur grob beschrieben (eigene PNG/WebP unter public/ ist deutlich besser).
 */
const MASCOT_TEXT_FALLBACK =
  "Central character: young herb fairy (Kräuterfee) — gentle smile, freckles, pointed elf ears, large warm brown eyes, messy dark brown hair with a top bun and woven crown of lavender sprigs and white daisies. She wears a delicate translucent green leaf-lace dress and a simple cord necklace with a green leaf-shaped gem. Large translucent insect wings with fine golden-yellow veins. Same whimsical digital-painting style as high-quality illustrated character art.";

export function buildKräuterfeeDalleImagePrompt(proseSnippet: string): string {
  const scene = sceneFromProse(proseSnippet);
  return [
    "Single cohesive square illustration for social media.",
    MASCOT_TEXT_FALLBACK,
    `Scene and story moment (visual only): "${scene}"`,
    STYLE_KRAEUTERFEE,
    "Rules: absolutely no text, letters, numbers, logos, watermarks, or captions. Family-friendly.",
  ].join(" ");
}

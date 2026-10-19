import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`;

const PROMPT = `Create a cyberpunk-utopic-dystopian digital artwork background for Solana Breakpoint 2026 in London, matching the real visual language of Solana's own official Breakpoint event branding: a bold Solana Purple #9945FF wash across the scene (not a dark navy-black background — Solana Purple should read as the dominant background tone, like event key art, with Solana Green #14F195 and Solana Magenta #DC1FFF as secondary accent colors blended in), overlaid with large rectangular block-shift glitch distortion — sections of the image sliced into blocky rectangular bands that are horizontally offset/displaced from each other, with hard-edged chromatic aberration and RGB channel splitting along the slice edges (red/cyan/green fringing where blocks misalign), like a corrupted video signal or datamosh block-shift effect. This is NOT a sparkly pixel-dissolve or confetti/particle-scatter effect — no small scattered sparkle particles anywhere; the glitch reads as a handful of large, deliberate rectangular block-slices, not fine noise.

Behind the purple glitch wash, a dark London skyline silhouette is visible, faded and partially obscured by the glitch blocks (similar to how the Big Ben clock tower reads through a purple glitch wash in Solana's own event key art) — feature the Shard (tall, tapering glass spire) and the Gherkin (rounded, bullet-shaped tower) at a large scale, silhouetted and partially glitch-obscured, still recognizable through the purple wash and block distortion. The buildings should feel like they're part of the same glitched, purple-toned scene, not a separate clean background layer.

Centered in the upper portion of the image, render the Solana logomark cleanly and prominently: three solid, flat, white rectangular parallelogram bars of equal length and equal width, stacked in a tight vertical column with a bar's-width gap between each, each bar slanted at a consistent angle like a forward slash (/), and each bar shifted slightly to the right of the one below it, so the three bars together lean and step diagonally. Render this logomark large enough to be clearly legible, in solid plain white, completely undistorted by the glitch — it should look like the one fixed, clean element in an otherwise glitched scene. This is NOT a star, diamond, chevron, or arrow — exactly three straight rectangular bars.

Below the logomark, leave a clearly empty, properly-spaced gap of plain/glitched background about the height of two text lines — do not render any text there at all, it will be added separately afterward.

This square image will be cropped into a circle; near the very top of the image the circle is much narrower than the square, so do NOT place the logomark or any important detail within the top 15% of the image — keep the logomark and empty text gap comfortably centered within the circle's bounds, starting at roughly 15-20% down from the top.

Leave the lower third of the image relatively clear of large glitch blocks and busy detail — a subject will be composited into that area later, so keep that zone readable enough for a portrait to sit on top of it later, even though the glitch/purple wash can continue subtly through it.

Square 1:1 aspect ratio, high resolution.`;

const CANDIDATES = 4;
const OUT_DIR = path.join(root, "scratch");

async function generateOne(index) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error (candidate ${index}): ${res.status} — ${err}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart) {
    const textPart = parts.find((p) => p.text);
    throw new Error(
      `No image in response for candidate ${index}. Model text: ${textPart?.text ?? "(none)"}`
    );
  }

  const buf = Buffer.from(imagePart.inlineData.data, "base64");
  const outPath = path.join(OUT_DIR, `template-candidate-${index}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Saved: ${outPath}`);
}

console.log(`Generating ${CANDIDATES} template candidates…`);

for (let i = 1; i <= CANDIDATES; i++) {
  try {
    await generateOne(i);
  } catch (err) {
    console.error(err.message);
  }
}

console.log("Done.");

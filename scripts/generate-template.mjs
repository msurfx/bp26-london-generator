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

const PROMPT = `Create a cyberpunk-utopic-dystopian digital artwork background for Solana Breakpoint 2026 in London, dark navy-black nighttime aesthetic, matching the real visual language of Solana's own official Breakpoint event branding (hero banners and speaker-page backgrounds): a dark, moody cityscape with large rectangular block-shift glitch distortion — sections of the image sliced into blocky rectangular bands that are horizontally offset/displaced from each other, with hard-edged chromatic aberration and RGB channel splitting along the slice edges (red/green/blue fringing where blocks misalign), like a corrupted video signal or datamosh block-shift effect. This is NOT a sparkly pixel-dissolve or confetti/particle-scatter effect — no small scattered squares or sparkle particles anywhere. The glitch reads as a handful of large, deliberate rectangular block-shifts with hard slice edges, not fine noise.

A dark navy-black nighttime London skyline, rendered as large, sharp, clearly-defined silhouettes — feature the Shard (tall, tapering glass spire) and the Gherkin (rounded, bullet-shaped tower) at a large scale, filling a meaningful portion of the frame, each with crisp architectural edges. The windows and lit sections across the skyline should glow in Solana's brand colors instead of warm white/amber — a gradient mix of Solana Purple #9945FF and Solana Green #14F195 across the buildings' windows, like the entire skyline is lit in Solana's palette rather than typical city lighting, while still reading as real building windows/lights, not a flat color wash. On one section of one building's facade (the Shard or the Gherkin), integrate the Solana logo (the three-bar mark: three solid rectangular bars, stacked diagonally, each offset to the right of the one below it — NOT a star, diamond, or chevron) as part of that building's own window lighting — a cluster of lit windows arranged into the three-bar shape, glowing in the Solana Purple-to-Green gradient, looking like part of the building's real architecture and lighting, not a flat sticker or projection screen.

The buildings should read as the dominant element — bold, high-contrast silhouettes against the navy-black sky. No street-level shops, billboards, or crowds. Leave the lower two-thirds of the image completely empty/plain dark background (no buildings, no objects) — a subject will be composited into that area later, so that space must stay clear and uncluttered.

This square image will be cropped into a circle; near the very top of the image the circle is much narrower than the square, so do NOT place any text or block-glitch slices within the top 15% of the image. Starting at roughly 15-18% down from the top, in the zone where the circle is close to full width, render centered text, narrow enough that the longest line uses no more than 65% of the image width: "SOLANA BREAKPOINT 2026" in a slim thin-weight sans-serif font, light grey, with a subtle block-shift/chromatic-aberration glitch on the letterforms consistent with the rest of the image (matching style, same rectangular-slice language — not a pixel-dissolve effect on the text). Below it, "LONDON" in the same style, slightly smaller. Beneath that, leave a clearly empty, properly-spaced gap of plain background the height of one more text line — do not render any placeholder text there, it will be filled in separately.

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

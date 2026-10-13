// Vercel serverless function: POST /api/generate
// Body: { image: "data:image/png;base64,....", handle: "MOONSURF", style: "neon-skyline" | "duotone-purple" | "duotone-green" }
// Returns: { image: "data:image/png;base64,...." } — the FINISHED, fully AI-generated
// pfp. The model renders the whole composition in one pass (photo treatment + any
// text + any logo) — nothing is composited in code afterward.
//
// THREE LOCKED TEMPLATES. Each is fixed; only the handle varies within a template.
// Picking a different style is picking a different fixed recipe, not a free-text prompt —
// that's what keeps every user's output consistent and on-brand.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const STYLES = {
  // Full event-badge composition: skyline, glitched RGB-split headline text, corner
  // logos, full Solana gradient. Good for "I'm going to Breakpoint" shareable badges.
  "neon-skyline": {
    label: "Neon Skyline",
    usesHandle: true,
    buildPrompt(handle) {
      return `Transform this portrait into a cyberpunk-utopic-dystopian digital artwork for Solana Breakpoint 2026 in London. Keep the person's face, features, and likeness clearly recognizable — do not change their identity. Crop into a clean circle with no border, stroke, or ring. Dark, moody nighttime London skyline silhouette in the background — only the Shard and the Gherkin as clean building silhouettes, no street-level shops, billboards, signage, or crowds, just the empty dark skyline and buildings. Apply glitch-art distortion with RGB channel splitting and chromatic aberration, horizontal pixel-sort/datamosh streaks, and a color grade using Solana Purple #9945FF, Solana Magenta #DC1FFF, and Solana Green #14F195 as glowing neon accents against the dark background. Render one side of the skyline dissolving into sharp pixel blocks scattering outward. At the top, add text reading "SOLANA BREAKPOINT 2026" in a slim sans-serif font, but render the letterforms themselves as glitched — apply RGB channel split directly to the type so each letter has visible offset red/green/blue ghosting, with a few letters sliced by thin horizontal datamosh scan-lines cutting through the text, like a corrupted video signal rather than clean neon signage. Below it, "LONDON" in the same glitched-letterform style, slightly smaller. Beneath that, "${handle}" in a bold weight (bolder than the other text), same glitched RGB-split style. Keep the faint purple circuit-line texture inside the hood or face area. Keep the small Solana logomark glowing faintly in the bottom corners, undistorted. Square 1:1 aspect ratio, high resolution.`;
    },
  },

  // Plain duotone, right-edge glitch only, no text at all — matches Solana's own
  // Breakpoint speaker-card photo treatment exactly. A clean stylized avatar.
  "duotone-purple": {
    label: "Duotone Purple",
    usesHandle: false,
    buildPrompt() {
      return `Transform this portrait into official Solana Breakpoint 2026 event branding style. Convert the photo to a duotone treatment: black and white tonal range, with Solana Purple (#9945FF) as the single accent color replacing all highlights and midtones — no other colors, no gradient. Keep the person's face and likeness clearly recognizable. Apply a vertical pixel-sort/datamosh glitch effect confined to a band on the right third of the image only — sharp rectangular vertical bars of varying height breaking the image into blocks, like architectural datamoshing, while the rest of the image (including the face) stays clean and undistorted. Keep the left two-thirds of the image sharp and clear with no glitch at all. Background: a plain black void, no skyline, no scene — just the duotone subject and the glitch bars. Square 1:1 aspect ratio, high resolution, matching the exact visual style of Solana Breakpoint's own event marketing — bold, confident, monochrome-purple, not multicolor. Do not add any text, letters, numbers, or logos to the image.`;
    },
  },

  // Same recipe as duotone-purple, swapped to Solana Green.
  "duotone-green": {
    label: "Duotone Green",
    usesHandle: false,
    buildPrompt() {
      return `Transform this portrait into official Solana Breakpoint 2026 event branding style. Convert the photo to a duotone treatment: black and white tonal range, with Solana Green (#14F195) as the single accent color replacing all highlights and midtones — no other colors, no gradient. Keep the person's face and likeness clearly recognizable. Apply a vertical pixel-sort/datamosh glitch effect confined to a band on the right third of the image only — sharp rectangular vertical bars of varying height breaking the image into blocks, like architectural datamoshing, while the rest of the image (including the face) stays clean and undistorted. Keep the left two-thirds of the image sharp and clear with no glitch at all. Background: a plain black void, no skyline, no scene — just the duotone subject and the glitch bars. Square 1:1 aspect ratio, high resolution, matching the exact visual style of Solana Breakpoint's own event marketing — bold, confident, monochrome-green, not multicolor. Do not add any text, letters, numbers, or logos to the image.`;
    },
  },
};

const DEFAULT_STYLE = "neon-skyline";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  const { image, handle, style } = req.body || {};
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Missing or invalid 'image' (expected a data: URL)" });
  }

  const styleKey = STYLES[style] ? style : DEFAULT_STYLE;
  const styleConfig = STYLES[styleKey];

  const safeHandle = (typeof handle === "string" ? handle : "MOONSURF")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 16) || "MOONSURF";

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Could not parse image data URL" });
  }
  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = styleConfig.usesHandle
      ? styleConfig.buildPrompt(safeHandle)
      : styleConfig.buildPrompt();

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              { inline_data: { mime_type: mimeType, data: base64Data } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      return res.status(502).json({ error: "Image generation failed upstream", detail: errText });
    }

    const result = await response.json();
    const parts = result?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData || p.inline_data);
    const inline = imagePart?.inlineData || imagePart?.inline_data;

    if (!inline?.data) {
      console.error("No image returned from Gemini:", JSON.stringify(result).slice(0, 500));
      return res.status(502).json({ error: "No image returned from the model" });
    }

    const outMime = inline.mimeType || inline.mime_type || "image/png";
    return res.status(200).json({ image: `data:${outMime};base64,${inline.data}`, style: styleKey });
  } catch (err) {
    console.error("generate.js error:", err);
    return res.status(500).json({ error: "Unexpected server error", detail: String(err) });
  }
}

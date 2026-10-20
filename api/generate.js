// Vercel serverless function: POST /api/generate
// Body: { image: "data:image/png;base64,....", style: "neon-skyline-purple" | "neon-skyline-green" }
// Returns: { image: "data:image/png;base64,...." } — the FINISHED, fully AI-generated
// pfp. The model renders the whole composition in one pass (photo treatment + scene).
// The BP26 logo is composited on top in code (index.html), not by the model.
//
// TWO LOCKED TEMPLATES. Each is a fixed recipe — picking a different style picks a
// different color treatment. Handle/text is optional: passed when the user entered one,
// omitted (empty string) otherwise — the model renders it only when present.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

const STYLES = {
  "neon-skyline-purple": {
    label: "Neon Skyline Purple",
    buildPrompt(handle) {
      const handleBlock = handle
        ? ` Near the bottom of the image, render the text "${handle}" in bold white, with the same block-shift glitch distortion and chromatic aberration as the rest of the scene — a few glitch block-slices crossing through the letterforms, consistent with the image's style. This square image will be cropped into a circle, and the circle is narrower near the very bottom edge, so keep this text starting no lower than about 78-80% down from the top, horizontally centered, no wider than about 65% of the image width, with every letter (including the first and last) fully visible and nowhere near the edge.`
        : "";
      return `Transform the attached portrait photo and place it into this scene: a cyberpunk-utopic-dystopian digital artwork background for Solana Breakpoint 2026 in London — a vibrant, bright, highly saturated Solana Purple (#9945FF) wash across the scene — punchy and electric, not dark, muted, dusty, or desaturated/grey-purple. The purple should read as vivid and glowing, like neon or UV light, clearly matching the exact hex #9945FF in brightness and saturation., large rectangular block-shift glitch distortion (blocky rectangular bands horizontally displaced from each other, hard-edged chromatic aberration/red-cyan fringing along slice edges), NOT a sparkle/pixel-dissolve/confetti effect.

Include a dark London skyline silhouette behind the subject, partially visible through the glitch blocks — feature the Shard and the Gherkin, large and recognizable.

Keep the person's face, features, and likeness clearly recognizable — do not change their identity. Apply the same block-shift glitch distortion and purple color treatment to the subject's portrait itself, so they look like part of the same glitched scene, not a separate clean layer pasted on top — a few glitch block-slices crossing over the subject, consistent chromatic aberration, so subject and background read as one unified piece.${handleBlock} Do not include any logo, logomark, wordmark, or other text anywhere else in the image beyond what's described above. Crop into a clean circle with no border, stroke, or ring. Square 1:1 aspect ratio, high resolution.`;
    },
  },

  "neon-skyline-green": {
    label: "Neon Skyline Green",
    buildPrompt(handle) {
      const handleBlock = handle
        ? ` Near the bottom of the image, render the text "${handle}" in bold white, with the same block-shift glitch distortion and chromatic aberration as the rest of the scene — a few glitch block-slices crossing through the letterforms, consistent with the image's style. This square image will be cropped into a circle, and the circle is narrower near the very bottom edge, so keep this text starting no lower than about 78-80% down from the top, horizontally centered, no wider than about 65% of the image width, with every letter (including the first and last) fully visible and nowhere near the edge.`
        : "";
      return `Transform the attached portrait photo and place it into this scene: a cyberpunk-utopic-dystopian digital artwork background for Solana Breakpoint 2026 in London — a bold Solana Green (#14F195) wash across the scene, large rectangular block-shift glitch distortion (blocky rectangular bands horizontally displaced from each other, hard-edged chromatic aberration/red-cyan fringing along slice edges), NOT a sparkle/pixel-dissolve/confetti effect.

Include a dark London skyline silhouette behind the subject, partially visible through the glitch blocks — feature the Shard and the Gherkin, large and recognizable.

Keep the person's face, features, and likeness clearly recognizable — do not change their identity. Apply the same block-shift glitch distortion and green color treatment to the subject's portrait itself, so they look like part of the same glitched scene, not a separate clean layer pasted on top.${handleBlock} Do not include any logo, logomark, wordmark, or other text anywhere else in the image beyond what's described above. Crop into a clean circle with no border, stroke, or ring. Square 1:1 aspect ratio, high resolution.`;
    },
  },
};

const DEFAULT_STYLE = "neon-skyline-purple";

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

  const hasHandle = typeof handle === "string" && handle.trim().length > 0;
  const safeHandle = hasHandle
    ? handle.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 16)
    : "";

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Could not parse image data URL" });
  }
  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = styleConfig.buildPrompt(safeHandle);

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

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
      return `Transform this portrait into a cyberpunk-utopic-dystopian digital artwork for Solana Breakpoint 2026 in London, matching a dark, moody nighttime aesthetic — the background should stay mostly dark navy-black, not a bright or pastel glow. Keep the person's face, features, and likeness clearly recognizable — do not change their identity. Crop into a clean circle with no border, stroke, or ring.

Background: a dark navy-black nighttime London skyline directly behind the subject, rendered as large, sharp, clearly-defined silhouettes — not a faint, blurry, or low-contrast smudge. Feature the Shard (tall, distinct tapering glass pyramid spire) and the Gherkin (rounded, bullet-shaped tower) at a large scale, filling a meaningful portion of the background so their outlines are instantly recognizable, each with crisp architectural edges and a dense scattering of small, sharply-lit windows picking out their structure in the dark. The buildings should read as the dominant background element — bold, high-contrast silhouettes against the navy-black sky — not tiny, hazy, or receding far into the distance. No street-level shops, billboards, signage, or crowds — just the dark skyline and buildings, clearly rendered.

Apply glitch-art distortion with RGB channel splitting and chromatic aberration, horizontal pixel-sort/datamosh streaks. Use Solana Purple #9945FF, Solana Magenta #DC1FFF, and Solana Green #14F195 sparingly, as glowing accents catching the glitch edges and circuit-line details — not as a wash of color over the whole background, which should stay dark. Render the upper-left portion of the image (hood/ears area) dissolving into sharp pixel blocks scattering outward.

This square image will be cropped into a circle. Near the very top of the image, the circle is much narrower than the square — text placed right at the top edge will get clipped on both sides. To avoid this, do NOT start the text block at the very top of the image. Instead, begin the text roughly 15–18% of the way down from the top edge, in the zone where the circle is already close to its full width. Also keep the whole text block noticeably smaller and more compact than you might default to — narrow enough that even the longest line uses no more than about 65% of the image's total width, centered. Render, in this order, top to bottom, starting at that ~15–18% mark: "SOLANA BREAKPOINT 2026" in a slim, thin-weight sans-serif font, light grey (not solid purple), with a subtle RGB channel split glitch on the letterforms — faint offset red/green/blue ghosting, a couple of letters sliced by thin horizontal datamosh scan-lines, like a slightly corrupted signal rather than bold neon signage. Below it, "LONDON" in the same thin grey glitched style, slightly smaller. Beneath that, "${handle}" in bold white — noticeably bolder and larger than the two lines above it, but still comfortably within that 65%-width limit — with the same glitch treatment. Every letter of every line, including the very first and last characters, must be fully visible and nowhere near the image edge.

Keep a faint purple circuit-line texture inside the hood or face area. On the side of one of the background buildings — the Shard or the Gherkin — render the Solana logo (the three-bar mark) as if it's an illuminated building projection or facade light display, the way brand logos get projected onto skyscrapers at night: a gradient wash across one tall vertical section of the building's face, using Solana Purple #9945FF, Solana Magenta #DC1FFF and Solana Green #14F195, in the form of the angled three-bar Solana mark glowing against the dark building facade, like light panels or projected light rather than a flat sticker — it should look like it belongs to the building's own lighting, consistent with the glitch/neon aesthetic of the rest of the image. The final image will be cropped into a circle, which cuts away the four corners of this square entirely — so do NOT place anything important in the corners. Square 1:1 aspect ratio, high resolution.`;
    },
  },

  // Plain duotone, right-edge glitch only, no text at all — matches Solana's own
  // Breakpoint speaker-card photo treatment exactly. A clean stylized avatar.
  "duotone-purple": {
    label: "Duotone Purple",
    usesHandle: false,
    buildPrompt() {
      return `Transform this portrait into official Solana Breakpoint 2026 event branding style. Convert the photo to a duotone treatment: black and white tonal range, with Solana Purple (#9945FF) as the single accent color replacing all highlights and midtones — no other colors, no gradient. Keep the person's face and likeness clearly recognizable. Apply a vertical pixel-sort/datamosh glitch effect across roughly the right half of the image — uneven, jittery, jagged vertical bars and slivers of varying width and height, scattered with visible gaps of clean background showing between them, like signal interference rather than a solid wall of bars. IMPORTANT: the glitch bars themselves must be tinted Solana Purple (#9945FF), not neutral grey or white — the distortion should look like the purple duotone image is corrupting/breaking apart, not like plain static laid on top of it. Moderate density: clearly present and visible, but not overwhelming or covering the area completely. Keep the face and the left portion of the image sharp and clearly undistorted. Background: a plain black void, no skyline, no scene — just the duotone subject and the purple-tinted glitch. Square 1:1 aspect ratio, high resolution, matching the exact visual style of Solana Breakpoint's own event marketing — bold, confident, monochrome-purple, not multicolor, and never grey/white. Do not add any text, letters, numbers, or logos to the image.`;
    },
  },

  // Same recipe as duotone-purple, swapped to Solana Green.
  "duotone-green": {
    label: "Duotone Green",
    usesHandle: false,
    buildPrompt() {
      return `Transform this portrait into official Solana Breakpoint 2026 event branding style. Convert the photo to a duotone treatment: black and white tonal range, with Solana Green (#14F195) as the single accent color replacing all highlights and midtones — no other colors, no gradient. Keep the person's face and likeness clearly recognizable. Apply a vertical pixel-sort/datamosh glitch effect across roughly the right half of the image — uneven, jittery, jagged vertical bars and slivers of varying width and height, scattered with visible gaps of clean background showing between them, like signal interference rather than a solid wall of bars. IMPORTANT: the glitch bars themselves must be tinted Solana Green (#14F195), not neutral grey or white — the distortion should look like the green duotone image is corrupting/breaking apart, not like plain static laid on top of it. Moderate density: clearly present and visible, but not overwhelming or covering the area completely. Keep the face and the left portion of the image sharp and clearly undistorted. Background: a plain black void, no skyline, no scene — just the duotone subject and the green-tinted glitch. Square 1:1 aspect ratio, high resolution, matching the exact visual style of Solana Breakpoint's own event marketing — bold, confident, monochrome-green, not multicolor, and never grey/white. Do not add any text, letters, numbers, or logos to the image.`;
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

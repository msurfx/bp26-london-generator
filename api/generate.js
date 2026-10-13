// Vercel serverless function: POST /api/generate
// Body: { image: "data:image/png;base64,...." }  (the user's uploaded photo)
// Returns: { image: "data:image/png;base64,...." } (the AI-generated duotone/glitch portrait)
//
// This is the ONE place the visual recipe lives for the AI pass. Every user's photo
// goes through the exact same PROMPT below, so every output matches the same template —
// that's what makes this an actual generator instead of a filter.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

// Locked template prompt — do not vary this per request. This is the BP26 duotone/glitch
// recipe, matched to Solana's own Breakpoint 2026 marketing (purple duotone, right-edge
// vertical pixel-sort glitch, clean black background, face left undistorted).
const BP26_PROMPT = `Transform this portrait into official Solana Breakpoint 2026 event branding style.
Convert the photo to a duotone treatment: black and white tonal range, with Solana Purple (#9945FF) as the single accent color replacing all highlights and midtones — no other colors, no gradient.
Keep the person's face and likeness clearly recognizable.
Apply a vertical pixel-sort/datamosh glitch effect confined to a band on the right third of the image only — sharp rectangular vertical bars of varying height breaking the image into blocks, like architectural datamoshing, while the rest of the image (including the face) stays clean and undistorted.
Keep the left two-thirds of the image sharp and clear with no glitch at all.
Background: a plain black void, no skyline, no scene — just the duotone subject and the glitch bars.
Square 1:1 aspect ratio, high resolution, matching the exact visual style of Solana Breakpoint's own event marketing — bold, confident, monochrome-purple, not multicolor.
Do not add any text, letters, numbers, or logos to the image.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing GEMINI_API_KEY" });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
    return res.status(400).json({ error: "Missing or invalid 'image' (expected a data: URL)" });
  }

  const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ error: "Could not parse image data URL" });
  }
  const mimeType = match[1];
  const base64Data = match[2];

  try {
    const model = "gemini-2.5-flash-image";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: BP26_PROMPT },
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
    return res.status(200).json({ image: `data:${outMime};base64,${inline.data}` });
  } catch (err) {
    console.error("generate.js error:", err);
    return res.status(500).json({ error: "Unexpected server error", detail: String(err) });
  }
}

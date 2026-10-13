# BP26 London Generator

A cyberpunk-utopic Solana Breakpoint 2026 (London, 15–17 Nov 2026) profile picture generator. Upload a photo, enter your handle, and get a fully AI-generated pfp — portrait treatment, headline, and Solana logomark all rendered in one pass by Gemini, matching Solana's own official Breakpoint marketing — ready to save and set as your X profile photo.

## Status

**Working end-to-end**, like doodles.toys: upload a photo → it's sent to `/api/generate` → Gemini generates the complete finished image (duotone portrait + glitch + headline text + logomark, all baked in by the model) → that comes straight back and displays in the circular frame. There is no code-drawn text or logo layered on top anymore — the model renders the whole composition itself, from one fixed, locked prompt (only the handle varies), so every user gets the same template with their own photo and name in it.

An earlier version tried splitting this — AI does the photo, code draws the text/logo on top — because AI text rendering is historically unreliable. In practice the code-drawn layer looked visibly fake next to the AI art (wrong positioning, wrong font weight, didn't react to what was actually in the photo). Full AI generation, with a tightly locked prompt, works better and is the simpler system — one source of truth for the whole image.

## Running it

Needs Vercel (or `vercel dev` locally) — not a plain static server — since `/api/generate` is a serverless function.

1. `npm i -g vercel` (if you don't have it)
2. In the project folder: `vercel dev`
3. Get a Gemini API key at https://aistudio.google.com/apikey
4. Copy `.env.example` to `.env.local` and paste your key in (never put the real key in `.env.example` itself — that file gets committed to git)
5. Open the local URL it prints, upload a photo, hit Generate

### Deploying

1. Push this repo to GitHub, import it into Vercel (framework preset: **Other**, no build command needed)
2. In Vercel → Project Settings → Environment Variables, add `GEMINI_API_KEY` with your key
3. Check **Settings → Deployment Protection** — if it's enabled, nobody outside your Vercel team can load the page at all (it'll 403 before your code even runs). Disable it for Production before sharing the link publicly.
4. Redeploy after any settings or env var change — Vercel doesn't retroactively apply them to an already-built deployment

## Design system

**Updated 2026-10-13, confirmed against official Breakpoint 2026 speaker cards and homepage hero:**

- **Duotone, not multicolor.** One accent color (Solana Purple `#9945FF`) over black and white. Never a magenta-purple-green gradient blend.
- **The glitch lives in the photo, not the text.** A vertical pixel-sort/datamosh band, confined to roughly the right third of the frame — sharp rectangular bars of varying height. The rest of the image, face included, stays clean.
- **Text stays completely clean.** No RGB split, no chromatic aberration on the letters. Bold, confident, geometric sans-serif, solid white or Solana Purple.
- **Black background**, no skyline/scene behind the subject.
- **The Solana logomark** (three stacked parallelograms, slightly offset, conveying motion) renders top-left, plain white, undistorted.
- **Everything above is rendered by the model in a single generation call** — the full locked prompt lives in `api/generate.js`'s `buildPrompt()`. That function is the one and only place this visual recipe is defined; only the handle is substituted per request.

## Next steps

- [x] Wire up a real image-gen API call (Gemini) for the AI pass.
- [x] Move all text/logo rendering into the AI prompt itself, out of canvas code.
- [ ] Add a loading/skeleton state in the circle while the AI call is in flight (a few seconds) — currently just a status-line message.
- [ ] Rate-limit or cache `/api/generate` before any public link goes out — it's currently an unauthenticated endpoint spending your Gemini quota on every call.
- [ ] Spot-check a handful of different uploaded photos (different lighting, angles, backgrounds) to confirm the text/logo placement and spelling stay consistent — AI-rendered text is the one part of this pipeline that can still drift per-request, so this needs real testing before Hacker House, not just one sample.
- [ ] Confirm use of the Solana logomark against Solana's actual brand guidelines before any public/official use.

Fan-made for Breakpoint 2026 · London. Not an official Solana Foundation product.

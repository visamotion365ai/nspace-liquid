# N Space — Liquid Glass

A real, installable music app: live catalogue search, streaming player with a 10-band spatial EQ,
an AI DJ, and an on-device offline vault. One codebase, tuned for **iPhone, iPad and Windows PWA**.

Same palette and UI font as the approved design (#ECEEF3 / #F5F5F7 / #1D1D1F / #FA243C, SF Pro stack),
plus one added display face (Instrument Serif) for the wordmark and headings.

## What is actually wired up

| Area | Status |
| --- | --- |
| Live search | `GET /api/search?q=` — YouTube catalogue + iTunes artwork, server-cached 3 min |
| Live mood feeds | `GET /api/trending?mood=` — for-you, chill, focus, energy, bangla, throwback |
| Audio | `GET /api/stream?v=` — range-aware proxy; tries full stream, falls back to the official 30s preview |
| AI DJ | `POST /api/agent/run` — works with no key (local intent engine) or with your own OpenAI / Anthropic key |
| Library | Local-first (IndexedDB + localStorage), synced across tabs with BroadcastChannel |
| Offline vault | Downloads to IndexedDB, plays with no signal |
| PWA | Manifest, maskable icons, service worker shell cache, install flow, `window-controls-overlay` for Windows |

No database and no server-side secrets are required to run it.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build + type check
```

Optional: set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to let the AI DJ use a language model.
Without a key the DJ still resolves mood and artist intent locally.

## Deploy

Import this repo at [vercel.com/new](https://vercel.com/new) — no environment variables needed.
Install it from the browser afterwards:

- iPhone / iPad: Share → Add to Home Screen
- Windows / Chrome: install icon in the address bar

## Notes

Full-length extraction depends on the host network; some clouds get a YouTube bot check.
In that case the player falls back to Apple's official preview clip and labels the track
"Official 30s preview" so nothing pretends to be something it is not.

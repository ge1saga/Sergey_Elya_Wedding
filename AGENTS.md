# AGENTS.md

## Project

Pure HTML/CSS/JS wedding invitation site for Sergey & Elvira (Сергей & Эльвира). No build step, no dependencies, no test/lint tooling. RSVP data sent via Node.js server (local) or Yandex Cloud Function (production) and pushed to GitHub as CSV.

## Commands

| Command | Purpose |
|---------|---------|
| `node server.js` | Run full server (static + API) on localhost:3000 |
| `npm install` | Install dependencies (express) |
| `npx serve .` | Static-only dev server (form submit won't work) |

## Key facts

- **Wedding date**: `script.js:34` sets `2026-09-13T15:30:00`.
- **RSVP**: Form POSTs to `API_URL` (`script.js:14`). Default `/api/rsvp` for local `server.js`. For production, set to Yandex Cloud Function public URL. Server appends data to `rsvp.csv` and optionally pushes to GitHub.
- **API** (`server.js`): Express server. `POST /api/rsvp` accepts JSON (`guestName`, `attendance`, `allergies`, `drinks`, `extraInfo`). Writes CSV row locally + pushes to GitHub if `GH_TOKEN`, `GH_OWNER`, `GH_REPO` env vars are set.
- **Cloud Function** (`cloud-function/handler.js`): Same logic but serverless. Handles CORS. Requires env vars via Yandex Cloud.
- **Splash screen**: Site content is hidden behind a splash with a slide-to-open thumb (`script.js:86-143`). Must be dismissed before content appears.
- **RSVP form logic** (`script.js:192-350`): Questions 3–5 are hidden until "Да" is selected on attendance. Wine subtype checkboxes are disabled until parent (white/red wine) is checked. "Не пью алкоголь" disables all other drink options.
- **Countdown timer**: Positioned at the very bottom of the page (after RSVP, before footer), not at the top.
- **Mobile confirm button** (`script.js:540-570`): Fixed button at bottom that hides when user scrolls past `#rsvp` section.
- **Fonts**: Google Fonts — Playfair Display, Inter, Great Vibes.
- **Images**: All in `images/` folder (open_screen.jpg, envelop.png, calendar.jpeg, heart.png, place.jpg, timing_*.png, color[1-5].jpg, line-bg.svg).
- **No `.git` repo**: git is not initialized in this directory.

## Stale docs

README.md and INSTRUCTIONS.md contain template placeholder content. Ignore those.

## Files

| File | Purpose |
|------|---------|
| `index.html` | All page content (293 lines, 7 nav-linked sections) |
| `style.css` | All styles + animations (1472 lines) |
| `script.js` | Splash, timer, RSVP form (POST to API_URL), nav, scroll animations |
| `server.js` | Express server: serves static + POST /api/rsvp → CSV + GitHub push |
| `package.json` | Node.js deps (express) |
| `cloud-function/handler.js` | Yandex Cloud Function handler (same logic, serverless) |
| `cloudflare-worker/` | Old Cloudflare Worker — no longer used |
| `opencode.jsonc` | TestSprite MCP config (has API key in `MY_ENV_VAR`) |

## RSVP flow

1. Form adds `submitted_at` timestamp to payload. 2. POST JSON to `API_URL`. 3. Server/function appends row to `rsvp.csv`. 4. If GitHub env vars are set, pushes CSV to GitHub repo. 5. Success/error toast shown.

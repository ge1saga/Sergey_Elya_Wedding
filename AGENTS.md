# AGENTS.md

## Project

Pure HTML/CSS/JS wedding invitation site for Sergey & Elvira (Сергей & Эльвира). No build step, no dependencies, no test/lint tooling. Has an associated Cloudflare Worker for RSVP data collection.

## Commands

Serve locally: `npx serve .` or `python -m http.server 8080`. Deploy Worker: `wrangler deploy`. No other commands.

## Key facts

- **Wedding date**: `script.js:32` sets `2026-09-13T15:30:00` (changed from earlier template defaults).
- **RSVP Worker URL**: `script.js:18` — POSTs JSON to Cloudflare Worker which writes to `rsvp.csv` via GitHub API.
- **Splash screen**: Site content is hidden behind a splash with a slide-to-open thumb (`script.js:86-143`). Must be dismissed before content appears.
- **RSVP form logic** (`script.js:192-350`): Questions 3–5 are hidden until "Да" is selected on attendance. Wine subtype checkboxes are disabled until parent (white/red wine) is checked. "Не пью алкоголь" disables all other drink options.
- **Countdown timer**: Positioned at the very bottom of the page (after RSVP, before footer), not at the top.
- **Mobile confirm button** (`script.js:479-497`): Fixed button at bottom that hides when user scrolls past `#rsvp` section.
- **Fonts**: Google Fonts — Playfair Display, Inter, Great Vibes (the README incorrectly says Cormorant Garamond + Montserrat).
- **Images**: All in `images/` folder (open_screen.jpg, envelop.png, calendar.jpeg, heart.png, place.jpg, timing_*.png, color[1-5].jpg, line-bg.svg).
- **No `.git` repo**: git is not initialized in this directory.

## Stale docs

README.md and INSTRUCTIONS.md contain template placeholder content for "Александр & Мария", date `2026-06-14`, wrong font names, and reference a photo gallery (`.gi-*` classes) that no longer exists in the codebase. Ignore those.

## Files

| File | Purpose |
|------|---------|
| `index.html` | All page content (293 lines, 7 nav-linked sections) |
| `style.css` | All styles + animations (1472 lines) |
| `script.js` | Splash, timer, RSVP form, nav, scroll animations (612 lines) |
| `api/rsvp.js` | Cloudflare Worker — receives POST, appends to `rsvp.csv` via GitHub API |
| `wrangler.toml` | Worker config (name, vars, compatibility_date) |
| `opencode.jsonc` | TestSprite MCP config (has API key in `MY_ENV_VAR`) |

## RSVP flow

1. Form adds `submitted_at` timestamp to payload. 2. JSON POST to Worker URL. 3. Worker fetches existing `rsvp.csv` from GitHub, appends row, PUTs updated file. 4. Success/error toast shown.

# AGENTS.md

## Project

Pure HTML/CSS/JS wedding invitation site. No build step, no dependencies, no test framework.

## Commands

None. Open `index.html` in a browser or run `npx serve .` / `python -m http.server 8080`.

## Key facts

- **Wedding date**: `script.js:34` sets `2026-06-26T14:00:00` — this is the live date; README mentions `2026-06-14` (stale).
- **Couple**: Sergey & Elvira (Сергей & Эльвира). Nav monogram is "C & Э". README refers to "Александр & Мария" (stale).
- **Form submission**: RSVP data is `POST`ed to Cloudflare Worker at `script.js:18` (from `setupForm` handler at `script.js:407`). Worker appends to `rsvp.csv` in the repo.
- **CSS variables**: All colors in `:root {}` at `style.css:9-20`.
- **Fonts**: Google Fonts (Playfair Display, Inter, Great Vibes) — requires internet.
- **Photos**: Placeholder gradient backgrounds in `.gi-1` through `.gi-6` classes. Real photos go in `photos/` folder, referenced via `style.css`.
- **No tests/lint/typecheck**: Static site; no tooling config exists.
- **RSVP section background**: Changed to `#f0eded` at `style.css:851-853`.
- **Mobile nav**: 7 links (Приглашение, Дата, Место проведения, Расписание, Дресс-код, Пожелания, Анкета). Nav closes on link click.
- **Mobile confirm button**: Hidden via JS when user scrolls past `#rsvp` section (`script.js:323-360`).

## Files

| File | Purpose |
|------|---------|
| `index.html` | All page content (~293 lines) |
| `style.css` | Styles + animations (~1398 lines) |
| `script.js` | Timer, form logic, splash screen, mobile nav, RSVP fetch (~612 lines) |
| `api/rsvp.js` | Cloudflare Worker — принимает POST с формой, пишет CSV в GitHub |
| `wrangler.toml` | Cloudflare Worker config |
| `opencode.jsonc` | MCP TestSprite config (has API key in `MY_ENV_VAR`) |

## RSVP flow

Form (`script.js:390`) adds `submitted_at` timestamp to payload, then `POST`s JSON to the Cloudflare Worker URL (`script.js:18`). Worker (`api/rsvp.js`) appends a row to `rsvp.csv` in the GitHub repo via API. Deploy Worker with `wrangler deploy`, static site via GitHub Pages.

## Gotchas

- README and INSTRUCTIONS.md contain setup examples for "Александр & Мария" — ignore; actual site is for Sergey & Elvira.
- Adding carousel quotes requires updating both `#wishes` cards and `#carouselDots` buttons in `index.html`.
- Form blocks can be removed by deleting `<div class="rsvp-q">` sections in `index.html`.
- Mobile nav menu scrolls internally if content overflows (`max-height: calc(100vh - 120px)` in `style.css:1224-1237`).

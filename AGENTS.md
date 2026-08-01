# AGENTS.md

## Project Context

Fan-made One Piece game (Grand Voyage) with UI/mechanics inspired by 7DS: Grand Cross.
Standalone Vite + React app. No Base44 dependency — game data lives in `src/data/` and player progress in `localStorage` via `src/lib/localDb.js`.

Start with `README.md` for local setup.

## Key Files

- `src/` — frontend application source
- `src/data/characters.js` — character catalog
- `src/data/chapters.js` — story chapters
- `src/lib/localDb.js` — local persistence layer
- `src/hooks/useGame.js` — game state hook
- `vite.config.js` — Vite + path alias `@`

## Working Notes

- Use `npm run dev` for local development.
- Prefer extending the local catalog/save layer over adding a remote backend unless requested.
- Run relevant checks from `package.json` before finishing code changes.

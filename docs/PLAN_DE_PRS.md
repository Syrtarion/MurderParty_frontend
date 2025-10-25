# Plan de PRs

## PR#1 - Docs & README
- Changelog : nouveau README, ajout /docs (audit, flows, API, stores, securite).
- Fichiers : `README.md`, `docs/*.md`.
- Tests : relecture Markdown.

## PR#2 - Resilience temps reel
- Backoff exponentiel (1.5s -> 30s) + retry sur coupure reseau.
- Attente connexion via listeners (plus de openPromise), buffer d'evenements, resync `GET /game/state`.
- Indicateur UI "Reconnexion..." + refresh automatique StatusBar/Room.
- Tests auto : Jest (socket/status bar/room) + Playwright e2e (room).
- Fichiers : `lib/socket.ts`, `components/StatusBar.tsx`, `app/(public)/room/[playerId]/page.tsx`, `docs/TODO_FRONTEND.md`, `package.json`, `jest.setup.ts`, `jest.config`, `__tests__/*`, `tests/e2e/*`, `playwright.config.ts`.

## PR#3 - Refactor state & types
- Stores separes, selecteurs, limites.
- Types centralises (`lib/types.ts`), payloads types.
- Impact : `lib/store.ts`, `lib/types.ts`, composants.

## PR#4 - Accessibilite & theming
- Focus ring, ARIA, avatars `aria-hidden`.
- Tokens Tailwind (dark mode).
- Diffusions UI (MJ/joueur).
- Fichiers : composants, `styles/globals.css`, `tailwind.config.ts`.

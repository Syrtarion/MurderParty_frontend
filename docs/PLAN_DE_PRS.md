# Plan de PRs

## PR#1 - Docs & README
- Changelog : nouveau README, ajout /docs (audit, flows, API, stores, securite).
- Fichiers : `README.md`, `docs/*.md`.
- Tests : relecture Markdown.

## PR#2 - Resilience temps reel
- Backoff exponentiel (1.5s -> 30s) + retry sur coupure reseau.
- Attente connexion via listeners (plus de openPromise), buffer d'evenements, resync `GET /game/state`.
- Tests auto : Jest (socket/status bar/room) + Playwright e2e (room).
- Fichiers : `lib/socket.ts`, `components/StatusBar.tsx`, `app/(public)/room/[playerId]/page.tsx`, `docs/TODO_FRONTEND.md`, `package.json`, `jest.setup.ts`, `jest.config`, `__tests__/*`, `tests/e2e/*`, `playwright.config.ts`.

## PR#3 - Refactor state & types ✅
- Centralisation des types (`lib/types.ts`), store joueur decoupe (`useGameActions`, `useGameClues`, `useGameEvents`).
- Composants ajustes (EventFeed, PlayerClues, room page) + tests mis a jour.
- Suivi: limiter taille des listes (events/clues) et extraire store MJ.

## PR#4 - Accessibilite & theming ✅
- Tokenisation des couleurs/focus dans `styles/globals.css` + classes utilitaires.
- Focus visible + aria-live (StatusBar, MasterControls, Room joueur).
- Boutons MJ retravaillés (btn-base + états occupés) et cartes refactorées.
- Fichiers : `styles/globals.css`, `components/StatusBar.tsx`, `components/MasterControls.tsx`, `app/(public)/room/[playerId]/page.tsx`, `components/EventFeed.tsx`, `components/PlayerClues.tsx`.


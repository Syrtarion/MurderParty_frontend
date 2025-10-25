# Plan de PRs

## PR#1 – Docs & README
- Changelog : nouveau README, ajout /docs (audit, flows, API, stores, sécurité…).
- Fichiers : `README.md`, `docs/*.md`.
- Tests : relecture Markdown.

## PR#2 – Résilience temps réel
- Backoff exponentiel (1.5 ? 3 ? 6 ? 12 s).
- Reset `openPromise`, buffer d’événements, resync `GET /game/state`.
- Indicateur UI “Reconnexion…”.
- Fichiers : `lib/socket.ts`, `components/StatusBar.tsx`, `app/(public)/room/[playerId]/page.tsx`, `lib/api.ts`.

## PR#3 – Refactor state & types
- Stores séparés, sélecteurs, limites.
- Types centralisés (`lib/types.ts`), payloads typés.
- Impact : `lib/store.ts`, `lib/types.ts`, composants.

## PR#4 – Accessibilité & theming
- Focus ring, ARIA, avatars `aria-hidden`.
- Tokens Tailwind (dark mode).
- Diffusions UI (MJ/joueur).
- Fichiers : composants, `styles/globals.css`, `tailwind.config.ts`.

# Plan de PRs

## PR#1 � Docs & README
- Changelog : nouveau README, ajout /docs (audit, flows, API, stores, s�curit�).
- Fichiers : `README.md`, `docs/*.md`.
- Tests : relecture Markdown.

## PR#2 � R�silience temps r�el
- Backoff exponentiel (1.5 ? 3 ? 6 ? 12 s).
- Reset `openPromise`, buffer d��v�nements, resync `GET /game/state`.
- Indicateur UI �Reconnexion��.
- Fichiers : `lib/socket.ts`, `components/StatusBar.tsx`, `app/(public)/room/[playerId]/page.tsx`, `lib/api.ts`.

## PR#3 � Refactor state & types
- Stores s�par�s, s�lecteurs, limites.
- Types centralis�s (`lib/types.ts`), payloads typ�s.
- Impact : `lib/store.ts`, `lib/types.ts`, composants.

## PR#4 � Accessibilit� & theming
- Focus ring, ARIA, avatars `aria-hidden`.
- Tokens Tailwind (dark mode).
- Diffusions UI (MJ/joueur).
- Fichiers : composants, `styles/globals.css`, `tailwind.config.ts`.

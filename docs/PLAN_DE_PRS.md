# Plan de PRs

## PR#1 - Docs & README
- Changelog : nouveau README, ajout `/docs` (audit, flows, API, stores, security).
- Fichiers : `README.md`, `docs/*.md`.
- Tests : relecture Markdown.

## PR#2 - Résilience temps réel & historique partagé (en cours)
- Backoff exponentiel + bufferisation + resync REST côté front.
- Endpoint `/game/events` (backend) + hydratation Room (historique commun).
- Documentation mise à jour (audit, game flow, kanban).
- Fichiers : `app/services/game_state.py`, `app/services/ws_manager.py`, `app/routes/game.py`, `lib/api.ts`, `lib/store.ts`, `app/(public)/room/[playerId]/page.tsx`, `docs/*`.

## PR#3 - Lint & CI hardening
- Corriger les violations `react/no-unescaped-entities` et dépendances `useEffect`.
- Ajouter le lint (`npm run lint`) dans `ci-frontend.yml` + instructions README.
- Tests : `npm run lint`, `npm test` (smoke).
- Fichiers : `app/(public)/*`, `components/*`, `.github/workflows/ci-frontend.yml`, `docs/TODO_FRONTEND.md`.

## PR#4 - Robustesse client API
- Ajouter AbortController + timeouts + retries exponentiels dans `lib/api.ts`.
- Gestion centralisée des erreurs (toast FR, mapping HTTP).
- Tests unitaires msw pour les wrappers.
- Fichiers : `lib/api.ts`, `lib/socket.ts` (si propagation), `__tests__/lib/api.test.ts`, `docs/*`.

## PR#5 - Accessibilité & theming
- Tokenisation des couleurs/focus dans `styles/globals.css` + classes utilitaires.
- Focus visible + aria-live (StatusBar, MasterControls, Room joueur).
- Boutons MJ retravaillés (états loading, hover) et cartes uniformisées.
- Fichiers : `styles/globals.css`, `components/StatusBar.tsx`, `components/MasterControls.tsx`, `app/(public)/room/[playerId]/page.tsx`, `components/EventFeed.tsx`, `components/PlayerClues.tsx`.

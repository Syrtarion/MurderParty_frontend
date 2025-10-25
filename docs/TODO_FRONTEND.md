# Kanban Frontend

| Done | En cours | Next | Backlog |
|------|----------|------|---------|
| - Pages principales (`/`, `/join`, `/room/[playerId]`, `/mj/dashboard`) <br> - Client REST minimal (`lib/api.ts`) <br> - Wrapper WebSocket renforcé (backoff + resync) <br> - Journal MJ basique <br> - Tests auto (Jest sur socket/StatusBar/Room, Playwright e2e joueur) <br> - Store joueur typé + selectors (`lib/types.ts`, `useGameActions`, `useGameEvents`) <br> - Accessibilité front (focus, theming, ARIA) | - Spoilers MJ (canon) caches par defaut <br> - Role/mission joueur : toggles afficher/masquer | **P0** Stabiliser les fixtures API pour tests e2e (msw/service worker) <br> **P1** Config ESLint/Prettier + script CI | - Tests e2e multi-joueurs (WS + rejoints tardifs) <br> - Support mini-jeux (Lot C) <br> - Mode kiosk / tablette centrale <br> - Internationalisation (FR par defaut, anticipation EN) |



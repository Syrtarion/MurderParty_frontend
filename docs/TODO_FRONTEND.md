# Kanban Frontend

| Done | En cours | Next | Backlog |
|------|----------|------|---------|
| - Pages principales (`/`, `/join`, `/room/[playerId]`, `/mj/dashboard`) <br> - Client REST minimal (`lib/api.ts`) <br> - Wrapper WebSocket renforce (backoff + resync) <br> - Journal MJ basique <br> - Tests auto (Jest sur socket/StatusBar/Room, Playwright e2e joueur) | - Spoilers MJ (canon) caches par defaut <br> - Role/mission joueur : toggles afficher/masquer | **P0** Stabiliser les fixtures API pour tests e2e (msw/service worker) <br> **P1** Config ESLint/Prettier + script CI <br> **P1** Refactor store (selecteurs, limites, types) | - Tests e2e multi-joueurs (WS + rejoints tardifs) <br> - Accessibilite (focus, ARIA, contrastes) <br> - Theming Tailwind (tokens) <br> - Support mini-jeux (Lot C) <br> - Mode kiosk / tablette centrale <br> - Internationalisation (FR par defaut, anticipation EN) |

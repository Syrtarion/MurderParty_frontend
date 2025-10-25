# Kanban Frontend

| Done ? | En cours ? | Next ?? | Backlog ??? |
|--------|-------------|---------|------------|
| - Pages principales (`/`, `/join`, `/room/[playerId]`, `/mj/dashboard`) <br> - Client REST minimal (`lib/api.ts`) <br> - Wrapper WebSocket (`lib/socket.ts`) <br> - Journal MJ basique | - Spoilers MJ (canon) cachés par défaut <br> - Rôle/mission joueur : toggles afficher/masquer | **P0** Résilience WS (backoff, buffer, resync) <br> **P0** Exposer rôle/mission dans `GET /game/state` & typage front <br> **P1** Config ESLint/Prettier + script CI <br> **P1** Refactor store (sélecteurs, limites, types) | - Tests e2e (Playwright) <br> - Accessibilité (focus, ARIA, contrastes) <br> - Theming Tailwind (tokens) <br> - Support mini-jeux (Lot C) <br> - Mode kiosk / tablette centrale <br> - Internationalisation (FR par défaut, anticipation EN) |

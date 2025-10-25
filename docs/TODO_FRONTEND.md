# Kanban Frontend

| Done ? | En cours ? | Next ?? | Backlog ??? |
|--------|-------------|---------|------------|
| - Pages principales (`/`, `/join`, `/room/[playerId]`, `/mj/dashboard`) <br> - Client REST minimal (`lib/api.ts`) <br> - Wrapper WebSocket (`lib/socket.ts`) <br> - Journal MJ basique | - Spoilers MJ (canon) cach�s par d�faut <br> - R�le/mission joueur : toggles afficher/masquer | **P0** R�silience WS (backoff, buffer, resync) <br> **P0** Exposer r�le/mission dans `GET /game/state` & typage front <br> **P1** Config ESLint/Prettier + script CI <br> **P1** Refactor store (s�lecteurs, limites, types) | - Tests e2e (Playwright) <br> - Accessibilit� (focus, ARIA, contrastes) <br> - Theming Tailwind (tokens) <br> - Support mini-jeux (Lot C) <br> - Mode kiosk / tablette centrale <br> - Internationalisation (FR par d�faut, anticipation EN) |

# Kanban Frontend

| Done | En cours | Next | Backlog |
|------|----------|------|---------|
| - Pages principales (`/`, `/join`, `/room/[playerId]`, `/mj/dashboard`) <br> - Client REST enrichi (`getGameEvents`, résolution d'URL) <br> - Wrapper WebSocket résilient (backoff + buffer + resync) <br> - Historique partagé `/game/events` + hydratation Room <br> - Store joueur dédupliqué (`setEvents`, `seenEvents`) <br> - Lint configuré (`.eslintrc` Next core web vitals) + CI mise à jour <br> - Test multi-clients (local + IP publique) validé — voir `docs/TESTS_MANUELS.md` | - Cadrage Lot C : inventaire des mini-jeux, UX attendue, dépendances backend | **P1** Timeout/AbortController + retries dans `lib/api.ts` <br> **P1** Borne/filtre du store d’événements (limite mémoire) <br> **P2** Préparer plan de tests e2e multi-joueurs | - Implémentation mini-jeux (Lot C) <br> - Mode kiosk / tablette centrale <br> - Internationalisation (FR par défaut, anticipation EN) <br> - Accessibilité complète (focus, ARIA, contrastes) |




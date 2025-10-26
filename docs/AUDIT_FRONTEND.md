# Audit Frontend – MurderParty (Next.js 14)

## Structure & Qualité
- Arborescence : `app/`, `components/`, `lib/`, `styles/`. Pas de séparation "page components".
- TypeScript : structuré (types partagés) mais `GameEvent.payload` reste permissif (`any` remonté du backend).
- ESLint : configuration `next/core-web-vitals` posée. `npm run lint` tourne mais échoue (règles `react/no-unescaped-entities`, `react-hooks/exhaustive-deps`). Prettier toujours absent.
- Scripts : `dev`, `build`, `start`, `lint`, `test`, `test:e2e`. CI n'exécute pas encore `lint`.
- CI : `.github/workflows/ci-frontend.yml` (Node 20, `npm ci`, `npm test --if-present`, `npm run build --if-present`). Ajouter lint/audit.

## Réseau & Temps réel
- `lib/api.ts` : résolution dynamique des URLs, endpoint `getGameEvents`. Toujours pas de timeout/AbortController/réessais.
- `lib/socket.ts` : backoff exponentiel, buffer d'envois, resync post-reconnect, ré-identification automatique.
- `/room/[playerId]` : snapshot initial + resync REST (évènements historiques) + WS + fallback poll. Préserve l'historique commun distants/local.
- Sécurité MJ : redirection `/mj/login` si `/party/status` échoue (OK).

## Stores
- `lib/store.ts` (Zustand) : `player`, `clues`, `events`, `setEvents`, sélecteurs dérivés. Déduplication par `seenEvents`. Limitation de taille à prévoir (front).
- Toujours full CSR (pas de SSR/RSC).

## Performance
- Pas de server components (tout `use client`).
- Pas de streaming/lazy pour sections lourdes.
- `.next/` commitée ? ajouter à `.gitignore`.
- Pas de memoisation sur listes (volume faible).
- Bundles globaux (pas de split par route).

## Sécurité / Confidentialité
- `.env.example` public (pas de secret backend).
- Dashboard MJ : canon masqué par toggle, OK.
- Joueur : rôle/mission = `localStorage` + toggles anti-spoiler.
- Journal MJ expose encore des payloads bruts (risque leak si écran partagé).

## Plan d’action
| Priority | Action | Effort | Risques |
|----------|--------|--------|---------|
| **P0** | Corriger les violations `react/no-unescaped-entities` & deps manquantes (lint bloquant) | M | Bloque CI lint |
| **P0** | Valider resync multi-clients (local + IP publique) & documenter procédure | M | Risque divergence d'état |
| **P1** | Ajouter lint (et éventuel formatting) à la CI | S | Faible |
| **P1** | Borne/filtre le store d'évènements côté front (éviter dérive) | S | Moyen terme |
| **P1** | Ajouter timeout/AbortController + retries dans `lib/api.ts` | M | Gestion erreurs réseau |
| **P2** | Accessibilité (focus visibles, ARIA, contrastes) | M | Faible |
| **P2** | Theming Tailwind | L | Impact design |
| **P2** | Tests e2e multi-joueurs Playwright | L | Setup lourd |

Quick wins : intégrer `npm run lint` en CI, corriger les chaînes non échappées, typage affiné `GameEvent.payload`, s'assurer `.next/` ignoré.


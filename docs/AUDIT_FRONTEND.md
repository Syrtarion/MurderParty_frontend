# Audit Frontend – MurderParty (Next.js 14)

## Structure & Qualité
- Arborescence : `app/`, `components/`, `lib/`, `styles/`. Pas de séparation "page components".
- TypeScript : en place mais `lib/store.ts` peu typé (`any` fréquent).
- ESLint/Prettier : non configurés (`next lint` lance le wizard). CI ne les exécute pas.
- Scripts : `dev`, `build`, `start`. Pas de `lint`, `test`.
- CI : `.github/workflows/ci-frontend.yml` (Node 20, `npm ci`, `npm test --if-present`, `npm run build --if-present`). Pas de lint/audit.

## Réseau & Temps réel
- `lib/api.ts` : wrapper fetch sans timeout/AbortController/réessais.
- `lib/socket.ts` :
  - Reconnexion simple (1.5 s) sans backoff.
  - `openPromise` non reset ? reconnect fragile.
  - Pas de buffer ni resync après reconnexion (perte d’événements possible).
  - Actions (identify) non réémises à la reconnexion.
- `/room/[playerId]` combine `GET /game/state` + WS + poll fallback (OK).
- Sécurité MJ : redirection `/mj/login` si `/party/status` échoue (OK).

## Stores
- `lib/store.ts` (Zustand) unique :
  - `player`, `clues`, `events`. Pas de sélecteurs.
  - Logs non limités.
  - Typage faible (`payload: any`).
- Tout en CSR (pas de SSR).

## Performance
- Pas de server components (tout `use client`).
- Pas de streaming/lazy pour sections lourdes.
- `.next/` commitée ? ajouter à `.gitignore`.
- Pas de memoisation sur listes (volume faible).
- Bundles globaux (pas de split par route).

## Sécurité / Confidentialité
- `.env.example` public (pas de secret backend).
- Dashboard MJ : canon masqué par toggle, OK.
- Joueur : rôle/mission = `localStorage`. UI doit prévoir toggle anti-spoiler.
- Journal `MasterControls` affiche JSON des réponses (risque leak si partage public).

## Plan d’action
| Priority | Action | Effort | Risques |
|----------|--------|--------|---------|
| **P0** | Corriger `_resolve_generate_endpoint` + lever `LLMServiceError` (backend) | S | Bloquant assignation |
| **P0** | Exposer `role`/`mission` dans `GET /game/state` + toggles UI | M | Joueurs sans info |
| **P1** | Résilience WS (backoff, buffer, resync) | M | Complexité reconnection |
| **P1** | Ajouter ESLint/Tailwind lint + script CI | S | Faible |
| **P1** | Refactor store (sélecteurs, typage, limites) | M | Migration |
| **P1** | Typage central (lib/types.ts) | S | Alignement back |
| **P2** | Accessibilité (focus, ARIA, avatars) | M | Faible |
| **P2** | Theming Tailwind | L | Impact design |
| **P2** | Tests e2e (Playwright) | L | Setup lourd |

Quick wins : `.gitignore` ? `.next/`, script `npm run lint`, reset `openPromise`, typage store.

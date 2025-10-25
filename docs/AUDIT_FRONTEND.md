# Audit Frontend � MurderParty (Next.js 14)

## Structure & Qualit�
- Arborescence : `app/`, `components/`, `lib/`, `styles/`. Pas de s�paration "page components".
- TypeScript : en place mais `lib/store.ts` peu typ� (`any` fr�quent).
- ESLint/Prettier : non configur�s (`next lint` lance le wizard). CI ne les ex�cute pas.
- Scripts : `dev`, `build`, `start`. Pas de `lint`, `test`.
- CI : `.github/workflows/ci-frontend.yml` (Node 20, `npm ci`, `npm test --if-present`, `npm run build --if-present`). Pas de lint/audit.

## R�seau & Temps r�el
- `lib/api.ts` : wrapper fetch sans timeout/AbortController/r�essais.
- `lib/socket.ts` :
  - Reconnexion simple (1.5 s) sans backoff.
  - `openPromise` non reset ? reconnect fragile.
  - Pas de buffer ni resync apr�s reconnexion (perte d��v�nements possible).
  - Actions (identify) non r��mises � la reconnexion.
- `/room/[playerId]` combine `GET /game/state` + WS + poll fallback (OK).
- S�curit� MJ : redirection `/mj/login` si `/party/status` �choue (OK).

## Stores
- `lib/store.ts` (Zustand) unique :
  - `player`, `clues`, `events`. Pas de s�lecteurs.
  - Logs non limit�s.
  - Typage faible (`payload: any`).
- Tout en CSR (pas de SSR).

## Performance
- Pas de server components (tout `use client`).
- Pas de streaming/lazy pour sections lourdes.
- `.next/` commit�e ? ajouter � `.gitignore`.
- Pas de memoisation sur listes (volume faible).
- Bundles globaux (pas de split par route).

## S�curit� / Confidentialit�
- `.env.example` public (pas de secret backend).
- Dashboard MJ : canon masqu� par toggle, OK.
- Joueur : r�le/mission = `localStorage`. UI doit pr�voir toggle anti-spoiler.
- Journal `MasterControls` affiche JSON des r�ponses (risque leak si partage public).

## Plan d�action
| Priority | Action | Effort | Risques |
|----------|--------|--------|---------|
| **P0** | Corriger `_resolve_generate_endpoint` + lever `LLMServiceError` (backend) | S | Bloquant assignation |
| **P0** | Exposer `role`/`mission` dans `GET /game/state` + toggles UI | M | Joueurs sans info |
| **P1** | R�silience WS (backoff, buffer, resync) | M | Complexit� reconnection |
| **P1** | Ajouter ESLint/Tailwind lint + script CI | S | Faible |
| **P1** | Refactor store (s�lecteurs, typage, limites) | M | Migration |
| **P1** | Typage central (lib/types.ts) | S | Alignement back |
| **P2** | Accessibilit� (focus, ARIA, avatars) | M | Faible |
| **P2** | Theming Tailwind | L | Impact design |
| **P2** | Tests e2e (Playwright) | L | Setup lourd |

Quick wins : `.gitignore` ? `.next/`, script `npm run lint`, reset `openPromise`, typage store.

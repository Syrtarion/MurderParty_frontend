# Architecture Frontend

## Modules
- `app/` : pages App Router (CSR).
- `components/` : UI (Joueur, MJ).
- `lib/api.ts` : client REST.
- `lib/socket.ts` : WebSocket + bus.
- `lib/store.ts` : Zustand (clues/events).
- `lib/types.ts` : types partagés.
- `styles/` : Tailwind.
- `.github/workflows/` : CI.

## Flux
1. REST (`lib/api.ts` ? `parse` ? composants/store).
2. WS (`lib/socket.ts` ? `emit` ? composants ? store).
3. Persistance locale (`localStorage`).

## Conventions
- Composants `use client`.
- Types centralisés `lib/types.ts`.
- Tests manuels `docs/tests-lotB.md`.
- Ajout event WS : typer, handler, doc.

## Dépendances
- Next.js 14, React 18.
- Zustand, Tailwind.
- Node 20 (CI).

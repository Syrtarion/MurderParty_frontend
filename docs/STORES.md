# Stores Zustand

## Shape actuelle
```ts
type GameState = {
  player?: Player;
  clues: Indice[];
  events: EventLog[];
  setPlayer(p: Player): void;
  addIndice(i: Indice): void;
  pushEvent(e: EventLog): void;
  reset(): void;
};
```

## Observations
- `EventLog.payload: any` ? typage à définir (`EventKind`).
- Pas de sélecteurs (composants rerender inutilement).
- Pas de limite (events infinis).
- Store unique Joueur/MJ (risque interférence).

## Recommandations
1. Séparer `useGameStore` (joueur) / `useMjStore`.
2. Ajouter sélecteurs et `React.memo`.
3. Limiter logs (ex: 200 derniers).
4. Ajouter `useConnectionStore` (état WS).
5. Documenter CSR uniquement (pas SSR).

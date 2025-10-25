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
- `EventLog.payload: any` ? typage � d�finir (`EventKind`).
- Pas de s�lecteurs (composants rerender inutilement).
- Pas de limite (events infinis).
- Store unique Joueur/MJ (risque interf�rence).

## Recommandations
1. S�parer `useGameStore` (joueur) / `useMjStore`.
2. Ajouter s�lecteurs et `React.memo`.
3. Limiter logs (ex: 200 derniers).
4. Ajouter `useConnectionStore` (�tat WS).
5. Documenter CSR uniquement (pas SSR).

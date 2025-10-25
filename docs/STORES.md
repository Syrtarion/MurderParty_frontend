# Stores Zustand

## Shape actuelle
```ts
type GameStore = {
  player?: PlayerState;
  clues: PlayerClue[];
  events: GameEvent[];
  setPlayer(player?: PlayerState): void;
  addClue(clue: PlayerClue): void;
  pushEvent(event: GameEvent): void;
  reset(): void;
};
```

## Hooks exposes
- `useGamePlayer()` ? lecture player courant
- `useGameClues()` / `useGameEvents()` ? lecture memoire
- `useGameActions()` ? mutations (`addClue`, `pushEvent`, `reset`, ...)

## Observations
- Typage central (`lib/types.ts`) clarifie `Mission`, `PlayerEnvelope`, `GameEvent`.
- Selecteurs dedies evitent rerenders inutiles.
- Limite events/clues encore a definir (TODO : garde-fou UX).
- Store unique cote joueur; un store MJ reste a introduire si besoin.

## Recommandations
1. Appliquer une politique de retention (ex: 200 derniers events) avant Lot C.
2. Re-exposer `useGameStore` brut seulement pour debug (eviter import direct ailleurs).
3. Etendre `GameEvent` avec union forte (`kind` discriminant) pour beneficier de l'autocomplete.
4. Creer `useMjStore` / `usePartyStore` quand le dashboard sera refactor (PR#3+).
5. Documenter l'ordre de push (`events` append -> UI gere l'affichage recents en premier).

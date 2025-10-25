# API Client (lib/api.ts)

## Conventions
- Base URL : `NEXT_PUBLIC_API_BASE`.
- `parse<T>` :
  - Throw si `!res.ok`, message FR.
  - Retour JSON ou `{}` si vide.
- Endpoints MJ ? `credentials: "include"`.

## Recommandations
- `AbortController` + timeout (`setTimeout`).
- Retries (429/503) optionnels.
- Mapping erreurs HTTP ? `Error(message)` FR.
- Types : centraliser dans `lib/types.ts`.

## Exemple
```ts
const status = await api.partyStatus();
setPhase(status.phase_label);
```

## Checklist
- `headers: { "Content-Type": "application/json" }` sur POST JSON.
- `encodeURIComponent` sur `player_id`.
- Ne pas logguer missions complètes dans UI publique.

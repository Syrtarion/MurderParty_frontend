# Events WebSocket

| Event | Payload | Source ? Dest | Description |
|-------|---------|---------------|-------------|
| `ws:open/close/error` | `null` | Client socket | Lifecycle connexion |
| `identified` | `{ player_id }` | Backend ? Joueur | Ack `identify` |
| `event` | `{ kind, ... }` | Backend ? Tous | Broadcast générique |
| `event:phase_change` | `{ kind:"phase_change", phase }` | Backend ? Tous | Changement de phase |
| `event:envelopes_update` | `{ kind:"envelopes_update", player_id?, envelopes? }` | Backend ? Joueur/broadcast | MAJ enveloppes |
| `clue` | `{ text, kind }` | Backend ? Joueur | Indice privé |
| `role_reveal` | `{ role }` | Backend ? Joueur | Rôle assigné |
| `secret_mission` | `{ title, text }` | Backend ? Joueur | Mission secrète |
| `event:roles_assigned` | `{ kind:"roles_assigned" }` | Backend ? Tous | Fin distribution rôles |

## Notes
- Pas d’ACK prévu (stateless). Ajouter REST fallback si besoin.
- `ws:error` ? trigger backoff (à implémenter).  
- `ws:close` ? reset `openPromise` + resync `GET /game/state`.

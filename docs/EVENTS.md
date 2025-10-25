# Events WebSocket

| Event | Payload | Source ? Dest | Description |
|-------|---------|---------------|-------------|
| `ws:open/close/error` | `null` | Client socket | Lifecycle connexion |
| `identified` | `{ player_id }` | Backend ? Joueur | Ack `identify` |
| `event` | `{ kind, ... }` | Backend ? Tous | Broadcast g�n�rique |
| `event:phase_change` | `{ kind:"phase_change", phase }` | Backend ? Tous | Changement de phase |
| `event:envelopes_update` | `{ kind:"envelopes_update", player_id?, envelopes? }` | Backend ? Joueur/broadcast | MAJ enveloppes |
| `clue` | `{ text, kind }` | Backend ? Joueur | Indice priv� |
| `role_reveal` | `{ role }` | Backend ? Joueur | R�le assign� |
| `secret_mission` | `{ title, text }` | Backend ? Joueur | Mission secr�te |
| `event:roles_assigned` | `{ kind:"roles_assigned" }` | Backend ? Tous | Fin distribution r�les |

## Notes
- Pas d�ACK pr�vu (stateless). Ajouter REST fallback si besoin.
- `ws:error` ? trigger backoff (� impl�menter).  
- `ws:close` ? reset `openPromise` + resync `GET /game/state`.

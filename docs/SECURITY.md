# S�curit� & Confidentialit�

## Anti-spoilers
- MJ : canon/r�les masqu�s par d�faut (toggle).
- Joueur : r�le/mission via toggle + `localStorage`. Aucun envoi backend.

## localStorage
- Cl�s autoris�es : `mp_role`, `mp_mission`, `player_id`.
- Nettoyage lors du d�part (`leave()`).

## MJ
- Auth via `/auth/mj/login` (cookie HttpOnly).
- Pas de secret dans le bundle.

## Logs
- `MasterControls` : journal interne (�viter fuite missions).
- `PlayerRoom` : ne pas afficher mission si toggle off.

## Env
- `.env.example` public (pas de secrets backend).

## WebSocket
- `identify` = `player_id` seul.
- Pr�voir backoff + resync pour �viter spams.

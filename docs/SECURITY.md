# Sécurité & Confidentialité

## Anti-spoilers
- MJ : canon/rôles masqués par défaut (toggle).
- Joueur : rôle/mission via toggle + `localStorage`. Aucun envoi backend.

## localStorage
- Clés autorisées : `mp_role`, `mp_mission`, `player_id`.
- Nettoyage lors du départ (`leave()`).

## MJ
- Auth via `/auth/mj/login` (cookie HttpOnly).
- Pas de secret dans le bundle.

## Logs
- `MasterControls` : journal interne (éviter fuite missions).
- `PlayerRoom` : ne pas afficher mission si toggle off.

## Env
- `.env.example` public (pas de secrets backend).

## WebSocket
- `identify` = `player_id` seul.
- Prévoir backoff + resync pour éviter spams.

# Tests manuels — Lot B

## Vérification multi-clients (local + IP publique)

1. **Préparation backend**
   - Démarrer le backend avec `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
   - Vérifier que le pare-feu autorise `python.exe` (port 8000).

2. **Préparation frontend**
   - Dans `.env.local`, conserver `NEXT_PUBLIC_API_BASE=http://localhost:8000` et `NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws`.
   - Lancer `npm run dev -- --hostname 0.0.0.0 --port 3000`.

3. **Client local**
   - Depuis le poste hôte, ouvrir `http://localhost:3000/join`.
   - Créer ou rejoindre un joueur et accéder à `/room/[playerId]`.

4. **Client distant**
   - Depuis un autre appareil, ouvrir `http://<IP_PUBLIQUE>:3000/join`.
   - Renseigner le même `player_id` (ou créer un nouveau joueur via l’UI).

5. **Validation**
   - Confirmer que le flux d’événements (“Flux d’événements”, journal latéral) reflète les mêmes entrées sur les deux navigateurs.
   - Tester un scénario de reconnexion (fermer temporairement le backend, le relancer, puis vérifier que la room distante recharge l’historique via `/game/events`).
   - Vérifier que les informations sensibles restent locales (rôle/mission masqués par défaut, persistés uniquement dans le navigateur).

### Statut
- ✅ 2025-10-25 — Test réalisé avec un navigateur local et un mobile via IP publique : flux d’événements identiques, reconnexion WS OK, rôle/mission toujours protégés côté client.

# Murder Party — Frontend (Starter)

Frontend Next.js (App Router) pour joueurs et Maître du Jeu. Léger, prêt à connecter ton backend FastAPI (REST + WebSocket).

## 1) Installation rapide

```bash
# 1. Dézippe ce projet
# 2. Dans ce dossier :
npm install

# 3. Copie l'exemple d'env
cp .env.example .env.local

# 4. Démarre le serveur de dev
npm run dev
```

Par défaut, l'UI écoute sur http://localhost:3000

## 2) Variables d'environnement

- `NEXT_PUBLIC_API_BASE` : URL du backend FastAPI (ex: `http://localhost:8000`)
- `NEXT_PUBLIC_WS_URL` : URL du WebSocket (ex: `http://localhost:8000`)
- `MJ_SECRET` (optionnel) : si tu veux injecter un secret côté build (sinon tu peux coller un Bearer dans l'UI MJ).

## 3) Routing

- `/` : Accueil
- `/join` : Page Joueur pour rejoindre la partie
- `/room/[playerId]` : Salle Joueur (flux + indices en live)
- `/mj/dashboard` : Tableau de bord MJ (contrôles + flux events)

## 4) Dossiers clés

- `app/` : Pages Next.js (App Router)
- `components/` : Composants UI
- `lib/` : Client API, socket, store Zustand, types
- `styles/` : TailwindCSS
- `.env.example` : Variables d'environnement (copie en `.env.local`)

## 5) Connexion au backend

- REST : `lib/api.ts` cible `NEXT_PUBLIC_API_BASE`
- WebSocket : `lib/socket.ts` cible `NEXT_PUBLIC_WS_URL`
- Événements écoutés côté client : `event:global`, `indice:new` (à aligner avec le backend)

## 6) TODO (selon ton backend)

- Ajuster les noms des events WebSocket et payloads.
- Sécuriser l'espace MJ (NextAuth ou Bearer).
- Thématiser l'UI Tailwind.
- Mapper plus finement `getGameState()` pour l'affichage.

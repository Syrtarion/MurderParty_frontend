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


## Grandes étapes
Machine à états (finalisée)

WAITING_START
  └─ (POST /party/start) → WAITING_PLAYERS
      [join_locked=false, les joueurs s’inscrivent]

WAITING_PLAYERS
  └─ (POST /master/lock_join) → ENVELOPES_DISTRIBUTION
      [join_locked=true, on fige la liste des joueurs, DISTRIB AUTO équitable des enveloppes]
      └─ (POST /party/envelopes_hidden) → ENVELOPES_HIDDEN
            [confirmation MJ: “les enveloppes sont cachées/prêtes sur tablettes”]
            └─ (POST /party/roles_assign) → ROLES_ASSIGNED
                  [LLM valide coupable/arme/lieu/motif + missions secondaires par joueur]
                  └─ (POST /party/session_start) → SESSION_ACTIVE
                        [rounds, minijeux, annonces]
                        └─ (POST /party/open_accusation) → ACCUSATION_OPEN
                              └─ (POST /party/end) → ENDED

## Notes clés

À l’inscription → on assigne uniquement le personnage (pas d’enveloppe, pas de mission).

Lock → lance distribution équitable (automatique) puis reste en ENVELOPES_DISTRIBUTION.

Enveloppes cachées → nouvelle phase ENVELOPES_HIDDEN (validation MJ que tout est physiquement/visuellement prêt).

Préparation LLM : dès ENVELOPLES_DISTRIBUTION, le moteur peut préparer le canon (coupable/arme/lieu/motif) en amont pour enchaîner vite quand on passe à roles_assign.

ROLES_ASSIGNED → chacun reçoit is_killer? + mission(s) secondaire(s) en message ciblé.

## API (REST) stabilisée
Public joueur

POST /auth/register {name, password} → 403 si join_locked.
Retour { player_id, name, character_id }. (Uniquement personnage.)

POST /auth/login {name, password} → idem.

GET /game/state → doit contenir au minimum :
{
  "phase_label": "WAITING_PLAYERS",
  "join_locked": false,
  "players": [ ... ],
  "ts": 1739654234
}

## Orchestration MJ (protégée)

POST /party/start → WAITING_PLAYERS, join_locked=false, WS phase_change, join_unlocked.

POST /master/lock_join → join_locked=true, lance distribution équitable (service envelopes), WS envelopes_update, reste ENVELOPES_DISTRIBUTION.

POST /party/redist_envelopes (option) → recalcul idempotent si besoin.

POST /party/envelopes_hidden → ENVELOPES_HIDDEN, WS phase_change.

POST /party/roles_assign → calcule/valide tueur + A/L/L/M + missions secondaires;
envoie WS ciblés type:"mission"/type:"role_reveal" + WS roles_assigned + phase_change→ROLES_ASSIGNED.

POST /party/session_start → SESSION_ACTIVE, WS phase_change.

POST /party/open_accusation → ACCUSATION_OPEN, WS phase_change.

POST /party/end → ENDED, WS phase_change.

POST /party/status → snapshot état.

Mini-jeux

POST /party/minigame/next (ou {id})

POST /party/minigame/score {minigame_id, scores:[{player_id,value}]} → WS leaderboard_update

Annonces & solution

POST /master/announce {text, level} → WS announcement

GET /party/solution (MJ-only) → spoiler-protect

POST /party/solution/reveal → diffusion finale (optionnel)

## WebSocket — messages (inchangés mais complétés)

Serveur → Clients (broadcast type:"event")

phase_change {phase: <PhaseLabel>}

join_locked, join_unlocked

players_update (inscriptions)

envelopes_update (après distribution, ou redist)

roles_assigned (missions envoyées)

round_advance {step}

announcement {text, level}

leaderboard_update {leaderboard:[...]}

Serveur → Joueur (ciblé)

type:"mission", payload {title, details, …}

type:"role_reveal", payload {is_killer: boolean}

type:"clue", payload {text, kind}

## UX / Interfaces (rappel avec l’étape enveloppes cachées)
MJ (protégée par mot de passe)

Pilotage :
Initialiser, Verrouiller, Redistribuer enveloppes, Enveloppes cachées, Assigner rôles & missions, Démarrer session, Minijeu suivant, Annonce, Ouvrir accusation, Terminer.

Joueurs : tableau live (nom, id court, rôle + photo, enveloppes, présence), actions rapides.

Timeline & évènements : feed + round+1.

Solution (spoiler) : coupable/arme/lieu/motif masqués (reveal on click).

Leaderboard : en temps réel.

Joueur

/join : créer/rejoindre/reprendre + phase/join_locked live.

/room/[playerId] : pseudo, photo personnage, enveloppes (affichage), missions (quand reçues), indices, annonces.

Tablette centrale

Phase & timeline (très visible),

Annonces (grand),

Minijeux (lancement/fin, scores),

Leaderboard live,

mode “kiosk” (lecture seule).

## Roadmap (mise à jour, prête à valider)
Lot A — Socle & inscriptions

Back

/party/start, /master/lock_join (→ distrib équitable auto + envelopes_update), /party/status.

GET /game/state expose phase_label, join_locked, players.

POST /auth/register → personnage uniquement (déjà OK si patch appliqué).

Front

/join live (WS + fallback), MasterControls avec Initialiser, Verrouiller, Status.

✅ Tests : inscriptions ouvertes/fermées en live ; distribution s’exécute au lock ; joueurs visibles.

Lot B — Enveloppes cachées & rôles/missions

Back

POST /party/envelopes_hidden → nouvelle phase ENVELOPES_HIDDEN.

POST /party/roles_assign → LLM valide coupable/arme/lieu/motif + missions secondaires; envoi WS ciblés + roles_assigned.

Services :

Distribution équitable (déjà appelée au lock) — idempotente.

Préparation canon (peut être déclenchée dès ENVELOPES_DISTRIBUTION), résultat consommé par roles_assign.

Front

MJ : boutons Enveloppes cachées & Assigner rôles & missions ; vue joueurs (photo perso + missions ? uniquement badge MJ).

Joueur : réception mission + éventuelle révélation tueur (role_reveal).

✅ Tests : seed muté, missions reçues, WS roles_assigned reçu partout, UI MJ/Joueur cohérentes.

Lot C — Session active & minijeux

Back

POST /party/session_start → SESSION_ACTIVE.

POST /party/minigame/next, POST /party/minigame/score → WS leaderboard_update.

POST /party/round/advance (option) → WS round_advance.

Front

MJ : timeline (rounds), minijeux.

Tablette : timeline, annonces, scores.

Joueur : panneau indices, éventuelle participation minijeu.

✅ Tests : rounds et scores se propagent live.

Lot D — Accusation & fin

Back

POST /party/open_accusation → ACCUSATION_OPEN.

POST /party/end → ENDED.

(Option) GET /party/solution (MJ-only) + POST /party/solution/reveal.

Front

MJ : panneau solution (spoiler-protect), bouton “Diffuser”.

Tablette : reveal final (si diffusé).

✅ Tests : fin propre, export logs.

## Micro-ajustements à prévoir dans le back (résumé actionnable)

/master/lock_join

Après join_locked=true, appeler le service de distribution équitable (idempotent).

Log + WS : envelopes_update (et garder phase_label=ENVELOPES_DISTRIBUTION).

/party/envelopes_hidden

phase_label = ENVELOPES_HIDDEN, WS phase_change.

Préparation LLM

Un hook (ex: MJ.prepare_canon() ou session_engine.prepare()) peut être déclenché à l’entrée en ENVELOPES_DISTRIBUTION, stocke un brouillon du canon pour roles_assign.

/party/roles_assign

Consomme la préparation (ou la calcule si manquante), valide le canon, assigne les missions secondaires, envoie WS ciblés + broadcast roles_assigned, passe à ROLES_ASSIGNED.

/party/session_start

phase_label=SESSION_ACTIVE, WS phase_change.

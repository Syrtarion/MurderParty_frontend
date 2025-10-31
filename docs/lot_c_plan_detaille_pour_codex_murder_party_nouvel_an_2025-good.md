# Lot C — Plan détaillé pour Codex (Murder Party Nouvel An 2025)

> **But du document** — Donner à l’agent Codex un brief exécutable et complet pour :
> 1) Migrer la logique de plan de session dans `story_seed.json` (source de vérité), 2) Mettre en place l’infra backend **sans BDD** (file‑store + snapshots), 3) Concevoir les endpoints/WS/timers/LLM, 4) Livrer un MVP **Tablette Narration**, 5) Implémenter la politique d’indices (partage/non‑partage/killer destroy), 6) Poser la base tests/CI, 7) Proposer un **plan de PR** par petits incréments.

---

## 0) Contexte produit & contraintes

- **Jeu** : Murder Party.
- **Interfaces** :
  - **Joueurs** (mobile/desktop web) — participent aux mini‑jeux, reçoivent/partagent des indices.
  - **MJ (Maître du Jeu)** — contrôle avancé (skip/retry, tirage équipes, scoring manuel si besoin).
  - **Tablette Narration** — *3e interface* affichant la narration (intro/outro) et servant de **confirmateur** pour `start/end` des mini‑jeux + saisie des **gagnants**. Un **onglet supplémentaire** doit être disponible **uniquement** sur l’appareil où l’on est connecté en MJ.
- **Timing** : le LLM **propose** des interludes/latences en fonction du temps global restant et du nombre de rounds restants, **validation manuelle obligatoire** sur la Tablette Narration.
- **LLM** : requis dès Lot C (intro session, intro/outro rounds LLM, énigmes moyennes **à réponse faisable**, packs d’indices multi‑niveaux, proposition d’interludes).
- **Joueurs max** : bornés par le **nombre de personnages** définis dans `story_seed.characters`. Le tueur est **toujours choisi parmi les joueurs**.
- **Pas de BDD** : stockage **fichier + mémoire** (snapshot & journal d’événements). Évolutif plus tard vers Redis si besoin.

---

## 1) Objectifs Lot C (résumé exécutif)

1. **Migration** : faire de `story_seed.json` la **source de vérité** (ordre/type/durée/narration des rounds, politique des indices, directives LLM, timing policy). Remplacer l’usage de `session_plan.json`.
2. **Backend sans BDD** : file‑store (`campaigns/<slug>/story_seed.json`, `sessions/<session_id>/game_state.json`, `sessions/<session_id>/events.ndjson`) + **cache mémoire** + **snapshots** périodiques.
3. **Endpoints & WebSocket** : sessions/teams, prepare/start/end round, submit, state, hints, killer destroy ; canal WS pour diffuser `phase`, `timer_tick`, `prompt`, `score_update`, `hint_delivered`.
4. **Pipeline LLM "prepare"** : pré‑générer **intro/outro/énigme/hint pack** avant chaque round LLM pour fluidifier l’animation.
5. **Politique d’indices** : partage/non‑partage (dégradation de tiers), **killer destroy** (quota 2), historique « qui a découvert quoi ».
6. **Tablette Narration (MVP)** : écran de confirmation start/end + gagnants + affichage des textes LLM.
7. **Tests & CI** : unit, integration (mock LLM), WS ; workflow GitHub Actions minimal `CI / ci`.
8. **Plan de PR** : petites unités mergeables, ordre logique proposé par Codex.

> **Important (changement d’architecture)** — Le `game_state.json` est **désormais par session** : **tous les codes** qui lisaient/écrivaient un `game_state.json` global doivent être **adaptés** pour pointer vers `sessions/<session_id>/game_state.json` et **ne plus** vers un emplacement statique. L’interface MJ doit **sélectionner la campagne** (`campaign_id`) puis **créer la session** (`POST /session`) afin d’obtenir `session_id` et initialiser le bon state.

---

## 2) Schéma cible `story_seed.json`

> **Nouveaux blocs clés** : `rounds[]`, `rules`, `meta.llm_directives`, `meta.timing_policy`. Tout le reste (univers, personnages, missions, enveloppes, canon) est **réutilisé**. Si tu vois une meilleure façon de faire, n’hésite pas.

```json
{
  "meta": {
    "version": "2.0",
    "title": "<titre>",
    "estimated_duration_minutes": 150,
    "players_min": 6,
    "players_max": 12,
    "llm_directives": {
      "language": "fr",
      "tone": "dramatique, immersif, légèrement gothique",
      "constraints": [
        "Ne jamais révéler le coupable trop tôt",
        "Équilibrer indices vrais et faux-fuyants",
        "Toujours relier les indices au canon narratif",
        "Rester cohérent avec le lieu, la météo, le ton"
      ]
    },
    "timing_policy": {
      "target_total_minutes": 150,
      "llm_interlude_picker": true,
      "must_confirm_on_tablet": true
    }
  },

  "setting": { "...": "inchangé" },
  "characters": [ "..." ],
  "missions": [ "..." ],
  "envelopes": [
    {
      "id": 1,
      "description": "Lettre scellée...",
      "object_type": "document",
      "llm_hint": "Contient un nom partiellement effacé.",
      "importance": "high",
      "qr": { "enabled": true, "code": "env-1" },
      "shareable": true
    }
  ],
  "canon_constraints": { "...": "inchangé" },

  "rules": {
    "killer": { "destroy_quota": 2 },
    "scoring": { "win_bonus": 1, "wrong_penalty": 0 }
  },

  "rounds": [
    {
      "id": 1,
      "code": "enigme_clef",
      "kind": "llm_enigme",
      "mode": "solo",
      "theme": "La clé du manoir",
      "max_seconds": 300,
      "narration": {
        "intro_seed": "Une clé ancienne attire tous les regards...",
        "outro_seed": "Le cliquetis s'éteint, mais les doutes persistent."
      },
      "llm": {
        "difficulty": "medium",
        "must_be_solvable": true,
        "hint_policy": {
          "tiers": ["major","minor","vague","misleading"],
          "sharing_rules": {
            "discoverer_major_others": "vague",
            "discoverer_vague_others": "misleading"
          }
        }
      }
    }
  ]
}
```

### Points d’attention
- `kind = "llm_enigme" | "physique"` ; `mode = "solo" | "team"` ; `max_seconds` fixé par round.
- Les rounds LLM **préparent** `intro/outro/énigme/hints` **avant** `start`.
- Les enveloppes portent `qr` et `shareable` pour le flux indices (scan & partage).

---

## 3) Plan de migration `session_plan.json` → `story_seed.rounds[]`

1. Créer `campaigns/<slug>/story_seed.json` (copie/merge de l’actuel + ajout de `rounds[]`).
2. **Adapter le code existant** :
   - **Lecture** de la campagne : remplacer tous les accès à `story_seed.json` statique par une **résolution via `campaign_id`** (sélection dans l’UI MJ → `load_story_seed(campaign_id)`).
   - **Écriture/Lecture du state** : remplacer tout accès à un `game_state.json` global par `sessions/<session_id>/game_state.json` (**scopé session**). Les services/handlers doivent recevoir `session_id`.
   - **Initialisation UI MJ** : depuis l’onglet MJ, **choisir la campagne**, appeler `POST /session` (retourne `session_id`, `join_code`) puis utiliser cet id partout.
3. **Mapping** par round :
   - `mini_game` → `code`
   - `type` (ex. `enigme_llm` | `jeu_physique`) → `kind` (`llm_enigme` | `physique`)
   - `solo|team` → `mode`
   - `max_seconds` → `max_seconds`
   - `narration.intro/outro` → `narration.intro_seed/outro_seed`
   - si `kind = llm_enigme` → ajouter `llm{ difficulty:"medium", must_be_solvable:true, hint_policy{...} }`
4. Écrire `scripts/migrate_session_plan_to_story_seed.py` (idempotent) puis **déprécier** tout accès direct à `session_plan`.

---

## 4) Backend sans BDD — stockage & résilience

- **Campagne** : `campaigns/<slug>/story_seed.json`.
- **Session runtime** : `sessions/<session_id>/game_state.json` (snapshot), `sessions/<session_id>/events.ndjson` (journal append‑only). pareil si des autres code faisaient appels à events.json et que maintenant events.ndjson et la nouvelle source il faudra adapter les autres scripts.
- **Cache mémoire** du `game_state` + **snapshot** toutes 5–10 s et à chaque transition majeure.
- **Restauration** : au reboot, recharger le dernier snapshot + rejouer les events récents.

### `GameState` (extraits clés)
- `phase` (`lobby|teams|round|interlude|finale|scoreboard`)
- `round_index`, `timer`, `players[]`, `teams[]`, `killer_id`
- `scoreboard`, `hints_history[]` (avec `{hint_id, by_player, tier, shared, destroyed, ts}`)

---

## 5) Endpoints & WebSocket (spécifications)

### REST (FastAPI)
- `POST /session` → crée la session, choisit `killer_id`, bornes joueurs depuis `story_seed.characters` → `{session_id, join_code, players_max}`
- `POST /session/{id}/teams/draw?mode=balanced|random` → calcule équipes
- `POST /session/{id}/round/{n}/prepare` → **pré‑génère** intro/outro/énigme/hints si `kind=llm_enigme`
- `POST /session/{id}/round/{n}/start` → passe en phase `round`, (re)lance timer
- `POST /session/{id}/round/{n}/end` → termine le round, enregistre `winners[]`, passe en `interlude`
- `POST /session/{id}/submit` → soumission joueur pour le round courant
- `POST /session/{id}/hint/share` → le découvreur choisit partager/non‑partager
- `POST /session/{id}/killer/destroy_hint` → action killer (quota 2)
- `GET /session/{id}/state` → snapshot côté client
- `GET /session/{id}/hints` → historique (inclut *qui a découvert quoi*)

### WebSocket
`WS /ws/session/{id}` — événements broadcast :
- `phase`, `timer_tick`, `prompt`, `riddle_ready`, `hint_delivered`, `score_update`, `round_end`

> **Laisser Codex optimiser** : l’agent peut ajuster les modèles, payloads et le découpage technique si une approche meilleure se présente.

---

## 6) Pipeline LLM « prepare round »

- Déclenché par `POST /session/{id}/round/{n}/prepare`.
- Pour les rounds `llm_enigme` :
  - Générer **intro/outro** basées sur `narration.*_seed`.
  - Générer **énigme** conforme au **thème**, **difficulté moyenne** et **réponse faisable**.
  - Générer **hint pack** : `major`, `minor`, `vague`, `misleading` ; **cohérents** (le trompeur ne contredit jamais `major`).
- Stocker ces éléments dans le state **avant** `start` → zéro latence au lancement.

### Politique d’indices (partage & killer)
- **Partage/non‑partage** par le découvreur (UI joueur) :
  - Si **partage** : tous reçoivent le **même niveau** choisi par le LLM selon la règle du round.
  - Si **ne partage pas** :
    - découvreur = **major** → autres = **vague**
    - découvreur = **vague** → autres = **misleading**
- **Killer destroy** : quota global **2** ; action silencieuse ; un scan ultérieur affiche « indice détruit / inexploitable ».

---

## 7) Tablette Narration (MVP)

- Vue **timeline** des rounds + état du timer.
- Boutons **Start round** / **End round** + sélection des **winners**.
- Affichage **intro/outro** (pré‑générées LLM).
- Résumé **indices découverts** (qui / quoi / niveau / partagé ? / détruit ?).

---

## 8) Tests & CI (Lot C minimal)

### Tests
- **Unit** : génération énigme (réponse non vide), policy hints (dégradation), transitions de phase, quota killer.
- **Integration** : `prepare → start → submit → end` (mock LLM) ; partages/non‑partages ; destroy killer.
- **WS** : diffusions `timer_tick`, `hint_delivered`, `score_update`.

### CI GitHub Actions
Workflow unique `/.github/workflows/ci.yml` (job `ci`) :
- Backend : `setup-python 3.11` + `pip install -r requirements.txt` + `-r requirements-dev.txt` (ou fallback `pytest`) + `pytest -q`.
- (Front traité dans un autre repo.)
- **Branch protection** : exiger le check `CI / ci` au merge.

---

## 9) Plan de PR (ordre proposé)

1) **schema-story-seed** — Models + loader + migration + adaptation des **références au nouveau chemin** `sessions/<session_id>/game_state.json`.
2) **state-store-file** — `sessions/*` (snapshots + events) + services de restauration.
3) **api-sessions-rounds** — endpoints Sessions/Teams/State + WS squelette.
4) **llm-prepare-pipeline** — `round/{n}/prepare` (intro/outro/riddle/hints) + mocks tests.
5) **hints-policy** — partage/non‑partage/dégradation + killer destroy + historique « qui ». Tests.
6) **tablet-mvp** — start/end + winners + affichage intro/outro + résumé indices.
7) **ws-timers** — vrais timers + `timer_tick` + tests WS de base.
8) **hardening-ci** — couverture min, lint/type (optionnel), doc.

> **Note** : Laisse Codex **réordonner ou optimiser** le plan si nécessaire, tant que les PR restent **petites et mergeables**.


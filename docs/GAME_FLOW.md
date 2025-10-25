# Flux de jeu � As-is & To-be

## As-is
### Joueur
1. `/join` (statut) ? `POST /auth/register`.
2. `/room/[playerId]` : `GET /game/state`, WS `identify`, �coute `event:*`, `clue`, `role_reveal`, `secret_mission`, fallback poll 15 s.
3. R�le/mission ? `localStorage`.

### MJ
1. `/mj/login` (cookie).
2. `/mj/dashboard` : actions `start`, `lock_join`, `envelopes_hidden`, `roles_assign`.
3. Canon spoiler toggle, joueurs (enveloppes + r�le toggle), journal. WS broadcast.

### Phases globales
- WAITING_START ? WAITING_PLAYERS ? ENVELOPES_DISTRIBUTION ? ENVELOPES_HIDDEN ? ROLES_ASSIGNED ? SESSION_ACTIVE ? ACCUSATION_OPEN ? ENDED.
- `roles_assign` : canon + missions, logs `ws_role_reveal_sent`, `ws_mission_sent`.

#### Diagramme �tat (as-is)
```mermaid
stateDiagram-v2
  [*] --> WAITING_START
  WAITING_START --> WAITING_PLAYERS: POST /party/start
  WAITING_PLAYERS --> ENVELOPES_DISTRIBUTION: POST /master/lock_join
  ENVELOPES_DISTRIBUTION --> ENVELOPES_HIDDEN: POST /party/envelopes_hidden
  ENVELOPES_HIDDEN --> ROLES_ASSIGNED: POST /party/roles_assign
  ROLES_ASSIGNED --> SESSION_ACTIVE: POST /party/session_start
  SESSION_ACTIVE --> ACCUSATION_OPEN: POST /party/open_accusation
  ACCUSATION_OPEN --> ENDED: POST /party/end
```

---

## To-be
### Am�liorations
- G�n�rer le canon d�s ENVELOPES_DISTRIBUTION (pr�load).
- `/party/session_start` :
  - Intro LLM (WS `narration`).
  - `SESSION.start_next_round()` (minijeu, prompts).
  - Timer (`start_timer` ? `narration half_time`, `timer_end`).
- R�silience WS : backoff exponentiel, buffer + resync REST.
- Accessibilit� : focus, ARIA, avatars `aria-hidden`.
- S�curit� : cookie MJ, pas de secrets dans bundle, logs filtr�s.
- UX : toggles spoiler pour r�le/mission, skeleton.

#### Diagramme s�quence (to-be)
```mermaid
sequenceDiagram
  participant MJ
  participant Backend
  participant WS
  participant Front

  MJ->>Backend: /party/start
  Front->>Backend: /auth/register
  Backend-->>Front: player_id, personnage
  WS-->>Front: event:phase_change (WAITING_PLAYERS)

  MJ->>Backend: /master/lock_join
  Backend-->>WS: event:envelopes_update
  Front->>Backend: GET /game/state (resync)

  note over Backend: Pr�pare canon (LLM) d�s ENVELOPES_DISTRIBUTION

  MJ->>Backend: /party/envelopes_hidden
  WS-->>Front: event:phase_change

  MJ->>Backend: /party/roles_assign
  WS-->>Front: role_reveal + secret_mission

  Front->>Front: stocke mp_role/mp_mission (toggle "Afficher")

  MJ->>Backend: /party/session_start
  Backend->>WS: narration intro, prompt minijeu
  Backend->>Backend: SESSION.start_timer(...)
  WS-->>Front: phase_change SESSION_ACTIVE

  opt WS down
    Front->>Backend: GET /game/state (poll)
  end
```

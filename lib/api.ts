// lib/api.ts


// Client REST unifié pour MurderParty (front Next.js)


// - Endpoints publics (joueurs)


// - Endpoints MJ sécurisés par cookie HttpOnly (credentials: "include")


//


// IMPORTANT : côté backend, /auth/mj/login pose un cookie 'mj_session' (HttpOnly).


// Tous les appels MJ ci-dessous envoient ce cookie via `credentials: "include"`.


//


// Variables denvironnement (front):


// NEXT_PUBLIC_API_BASE=http://localhost:8000


// NEXT_PUBLIC_WS_URL=http://localhost:8000


//


// Notes:


// - Pas dAuthorization Bearer ici pour le MJ ; on passe par le cookie.


// - Les méthodes retournent des erreurs explicites si code HTTP != 2xx.





import type { Mission } from "@/lib/types";
export type { Mission } from "@/lib/types";

export type RawGameEvent = {
  id: string;
  type: string;
  payload: any;
  ts: number | null;
  scope?: string | null;
  channel?: string | null;
  targets?: string[];
};

export type GameEventsResponse = {
  ok: boolean;
  count: number;
  events: RawGameEvent[];
  latest_ts?: number | null;
};

export type IntroStatus = {
  status: string;
  title?: string | null;
  text?: string | null;
  prepared_at?: number | null;
  confirmed_at?: number | null;
  error?: string | null;
};

export type SessionCreateResponse = {
  session_id: string;
  join_code: string | null;
  players_max?: number | null;
};

export type PreparedRound = {
  round_index: number;
  round_id?: number | string | null;
  code?: string | null;
  kind?: string | null;
  mode?: string | null;
  theme?: string | null;
  prepared_at?: number;
  narration?: {
    intro_seed?: string | null;
    intro_text?: string | null;
    outro_seed?: string | null;
    outro_text?: string | null;
  };
  llm_assets?: Record<string, unknown>;
};

export type SessionStatus = {
  phase: string;
  round_index: number;
  current_round?: Record<string, unknown> | null;
  next_round?: Record<string, unknown> | null;
  total_rounds: number;
  has_timer: boolean;
  prepared_round?: PreparedRound | null;
  session_id?: string;
  join_code?: string | null;
  players_count?: number;
  intro?: IntroStatus | null;
};

function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";
  try {
    const url = new URL(raw);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (
        hostname &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ) {
        url.hostname = hostname;
      }
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

const API_BASE = resolveApiBase();

let CURRENT_SESSION_ID = "default";

export function setSessionId(sessionId: string) {
  CURRENT_SESSION_ID = sessionId?.trim() || "default";
}

export function getSessionId(): string {
  return CURRENT_SESSION_ID;
}

function withSession(url: string, sessionId: string = CURRENT_SESSION_ID): string {
  if (!sessionId) return url;
  if (url.includes("session_id=")) return url;
  const delimiter = url.includes("?") ? "&" : "?";
  return `${url}${delimiter}session_id=${encodeURIComponent(sessionId)}`;
}

function sessionFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const finalInit: RequestInit = { ...init };
  if (!finalInit.credentials) {
    finalInit.credentials = "include";
  }
  return fetch(withSession(url), finalInit).then(parse);
}





async function parse<T>(res: Response): Promise<T> {


  if (!res.ok) {


    let msg = `${res.status} ${res.statusText}`;


    try {


      const j = await res.json();


      if (j?.detail) msg = `${msg}  ${j.detail}`;


    } catch {


      // body non JSON


    }


    throw new Error(msg);


  }


  try {


    return (await res.json()) as T;


  } catch {


    // 204 no content ou body vide


    return {} as T;


  }


}








// ---------- Types ----------





export type PartyStatus = {
  ok: boolean;
  phase_label: string;
  join_locked: boolean;
  players_count: number;
  players?: Array<{
    player_id: string;
    name: string;
    character_id?: string | null;
    character_name?: string | null;
    role?: string | null;
    envelopes?: number;
  }>;
  session_id?: string;
  join_code?: string | null;
  envelopes: { total: number; assigned: number; left: number };
  intro?: IntroStatus | null;
};





export type GameState = {


  phase_label: string;


  join_locked: boolean;


  players: {


    player_id: string;


    name: string;


    character_id?: string | null;


    character_name?: string | null;


  }[];


  me?: {


    player_id: string;


    name: string;


    character_id?: string | null;


    character_name?: string | null;


    envelopes: { num: number; id: string }[];


    role?: string | null;


    mission?: Mission | null;


  };


};





export type AuthOut = {


  player_id: string;


  name: string;


  character_id?: string | null;


  character_name?: string | null;


};





// ---------- API public (joueurs) ----------





export const api = {


  getGameState: (playerId?: string): Promise<GameState> => {
    const base = `${API_BASE}/game/state`;
    const url = playerId
      ? `${base}?player_id=${encodeURIComponent(playerId)}`
      : base;
    return fetch(withSession(url), { cache: "no-store" }).then(parse);
  },








  getGameEvents: (opts: {
    playerId?: string;
    sinceTs?: number | null;
    limit?: number;
    audience?: "player" | "admin";
  } = {}): Promise<GameEventsResponse> => {


    const params = new URLSearchParams();


    if (opts.playerId) params.set("player_id", opts.playerId);


    if (typeof opts.sinceTs === "number") {


      params.set("since_ts", String(opts.sinceTs));


    }


    if (typeof opts.limit === "number") {


      params.set("limit", String(opts.limit));


    }


    if (opts.audience && opts.audience !== "player") {


      params.set("audience", opts.audience);


    }


    const qs = params.toString();


    const url = qs ? `${API_BASE}/game/events?${qs}` : `${API_BASE}/game/events`;


    return fetch(url, { credentials: "include" }).then(parse);


  },



  getCanon: (): Promise<any> =>
    sessionFetch(`${API_BASE}/game/canon`),





  register: (name: string, password: string): Promise<AuthOut> =>


    fetch(`${API_BASE}/auth/register`, {


      method: "POST",


      headers: { "Content-Type": "application/json" },


      body: JSON.stringify({ name, password }),


    }).then(parse),





  login: (name: string, password: string): Promise<AuthOut> =>


    fetch(`${API_BASE}/auth/login`, {


      method: "POST",


      headers: { "Content-Type": "application/json" },


      body: JSON.stringify({ name, password }),


    }).then(parse),





  me: (playerId: string): Promise<AuthOut> =>


    fetch(`${API_BASE}/auth/me?player_id=${encodeURIComponent(playerId)}`).then(parse),





  // ---------- API MJ (cookie HttpOnly requis) ----------





  // Auth MJ (pose/retire le cookie)


  mjLogin: (username: string, password: string): Promise<{ ok: boolean; ttl: number }> =>


    fetch(`${API_BASE}/auth/mj/login`, {


      method: "POST",


      headers: { "Content-Type": "application/json" },


      credentials: "include", // <-- envoie/reà§oit le cookie


      body: JSON.stringify({ username, password }),


    }).then(parse),





  mjLogout: (): Promise<{ ok: boolean }> =>


    fetch(`${API_BASE}/auth/mj/logout`, { method: "POST", credentials: "include" }).then(parse),





  // Socle partie (Lot A)


  partyStart: (): Promise<any> =>
    sessionFetch(`${API_BASE}/party/start`, { method: "POST" }),


  partyStatus: (): Promise<PartyStatus> =>
    sessionFetch(`${API_BASE}/party/status`),


  resetSession: (sessionId: string): Promise<any> => {
    const sid = encodeURIComponent(sessionId);
    return fetch(`${API_BASE}/admin/reset_game?session_id=${sid}`, {
      method: "POST",
      credentials: "include",
    }).then(parse);
  },


  masterLockJoin: (): Promise<any> =>
    sessionFetch(`${API_BASE}/master/lock_join`, { method: "POST" }),





  masterUnlockJoin: (): Promise<any> =>
    sessionFetch(`${API_BASE}/master/unlock_join`, { method: "POST" }),


  envelopesSummary: (): Promise<any> =>
    sessionFetch(`${API_BASE}/master/envelopes/summary`),


  postEnvelopesHidden: (): Promise<any> =>
    sessionFetch(`${API_BASE}/party/envelopes_hidden`, { method: "POST" }),


  postRolesAssign: (): Promise<any> =>
    sessionFetch(`${API_BASE}/party/roles_assign`, { method: "POST" }),

  launchParty: (options?: { useLLMIntro?: boolean }): Promise<any> => {
    const query = options?.useLLMIntro === false ? "?use_llm_intro=false" : "";
    return sessionFetch(`${API_BASE}/party/launch${query}`, { method: "POST" });
  },
  startNextRound: (options?: { autoPrepareRound?: boolean; useLLMRounds?: boolean }): Promise<any> => {
    const params = new URLSearchParams();
    if (options?.autoPrepareRound === false) params.set("auto_prepare_round", "false");
    if (options?.useLLMRounds === false) params.set("use_llm_rounds", "false");
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return sessionFetch(`${API_BASE}/session/start_next${suffix}`, { method: "POST" });
  },


  sessionStatus: (): Promise<SessionStatus> =>
    sessionFetch(`${API_BASE}/session/status`),

  createSession: (payload: { campaignId?: string; sessionId?: string } = {}): Promise<SessionCreateResponse> =>
    fetch(`${API_BASE}/session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(parse),

  confirmIntro: (opts: { sessionId?: string; useLLMRounds?: boolean } = {}): Promise<any> => {
    const sid = encodeURIComponent(opts.sessionId ?? getSessionId());
    const query = opts.useLLMRounds === false ? "?use_llm_rounds=false" : "";
    return fetch(
      `${API_BASE}/session/${sid}/intro/confirm${query}`,
      { method: "POST", credentials: "include" },
    ).then(parse);
  },

  prepareRound: (roundNumber: number, options?: { useLLM?: boolean }): Promise<any> => {
    const sid = encodeURIComponent(getSessionId());
    const query = options?.useLLM === false ? "?use_llm=false" : "";
    return fetch(
      `${API_BASE}/session/${sid}/round/${roundNumber}/prepare${query}`,
      { method: "POST", credentials: "include" },
    ).then(parse);
  },



  listSessionHints: (opts: { playerId?: string; sessionId?: string } = {}): Promise<any> => {

    const sid = encodeURIComponent(opts.sessionId ?? getSessionId());

    const params = new URLSearchParams();

    if (opts.playerId) params.set("player_id", opts.playerId);

    const suffix = params.toString();

    return fetch(

      `${API_BASE}/session/${sid}/hints${suffix ? `?${suffix}` : ""}`,

      { credentials: "include" },

    ).then(parse);

  },



  shareHint: (input: {

    roundIndex: number;

    discovererId: string;

    tier?: string;

    share: boolean;

    sessionId?: string;

  }): Promise<any> => {

    const sid = encodeURIComponent(input.sessionId ?? getSessionId());

    const body = {

      round_index: input.roundIndex,

      discoverer_id: input.discovererId,

      tier: input.tier ?? "major",

      share: input.share,

    };

    return fetch(`${API_BASE}/session/${sid}/hint/share`, {

      method: "POST",

      credentials: "include",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(body),

    }).then(parse);

  },



  destroyHint: (input: { hintId: string; killerId: string; sessionId?: string }): Promise<any> => {

    const sid = encodeURIComponent(input.sessionId ?? getSessionId());

    const body = {

      hint_id: input.hintId,

      killer_id: input.killerId,

    };

    return fetch(`${API_BASE}/session/${sid}/killer/destroy_hint`, {

      method: "POST",

      credentials: "include",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify(body),

    }).then(parse);

  },


};






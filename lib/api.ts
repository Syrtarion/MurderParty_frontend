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





const BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");





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


  envelopes: { total: number; assigned: number; left: number };


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


    const url = playerId


      ? `${BASE}/game/state?player_id=${encodeURIComponent(playerId)}`


      : `${BASE}/game/state`;


    return fetch(url, { cache: "no-store" }).then(parse);


  },





  getCanon: (): Promise<any> =>


    fetch(`${BASE}/game/canon`, { credentials: "include" }).then(parse),





  register: (name: string, password: string): Promise<AuthOut> =>


    fetch(`${BASE}/auth/register`, {


      method: "POST",


      headers: { "Content-Type": "application/json" },


      body: JSON.stringify({ name, password }),


    }).then(parse),





  login: (name: string, password: string): Promise<AuthOut> =>


    fetch(`${BASE}/auth/login`, {


      method: "POST",


      headers: { "Content-Type": "application/json" },


      body: JSON.stringify({ name, password }),


    }).then(parse),





  me: (playerId: string): Promise<AuthOut> =>


    fetch(`${BASE}/auth/me?player_id=${encodeURIComponent(playerId)}`).then(parse),





  // ---------- API MJ (cookie HttpOnly requis) ----------





  // Auth MJ (pose/retire le cookie)


  mjLogin: (username: string, password: string): Promise<{ ok: boolean; ttl: number }> =>


    fetch(`${BASE}/auth/mj/login`, {


      method: "POST",


      headers: { "Content-Type": "application/json" },


      credentials: "include", // <-- envoie/reà§oit le cookie


      body: JSON.stringify({ username, password }),


    }).then(parse),





  mjLogout: (): Promise<{ ok: boolean }> =>


    fetch(`${BASE}/auth/mj/logout`, { method: "POST", credentials: "include" }).then(parse),





  // Socle partie (Lot A)


  partyStart: (): Promise<any> =>


    fetch(`${BASE}/party/start`, { method: "POST", credentials: "include" }).then(parse),





  partyStatus: (): Promise<PartyStatus> =>


    fetch(`${BASE}/party/status`, { credentials: "include" }).then(parse),





  masterLockJoin: (): Promise<any> =>


    fetch(`${BASE}/master/lock_join`, { method: "POST", credentials: "include" }).then(parse),





  masterUnlockJoin: (): Promise<any> =>


    fetch(`${BASE}/master/unlock_join`, { method: "POST", credentials: "include" }).then(parse),





  envelopesSummary: (): Promise<any> =>


    fetch(`${BASE}/master/envelopes/summary`, { credentials: "include" }).then(parse),





  postEnvelopesHidden: (): Promise<any> =>


    fetch(`${BASE}/party/envelopes_hidden`, { method: "POST", credentials: "include" }).then(parse),





  postRolesAssign: (): Promise<any> =>


    fetch(`${BASE}/party/roles_assign`, { method: "POST", credentials: "include" }).then(parse),


};






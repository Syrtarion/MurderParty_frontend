'use client';







import { useCallback, useEffect, useMemo, useRef, useState } from "react";



import { useParams, useRouter } from "next/navigation";



import StatusBar from "@/components/StatusBar";



import { api, Mission } from "@/lib/api";
import type { GameEvent } from "@/lib/types";



import { connect, isConnected, on } from "@/lib/socket";



import { useGameActions } from "@/lib/store";



import PlayerClues from "@/components/PlayerClues";



import EventFeed from "@/components/EventFeed";







/**



 * Room Joueur



 * - Snapshot initial via GET /game/state?player_id=...



 * - WS: "event" (générique), "clue", "event:phase_change", "event:envelopes_update", "role_reveal", "secret_mission"



 * - MAJ enveloppes immédiate si payload contient {player_id, envelopes}, sinon fallback fetch.



 * - Poll fallback si WS down.



 * - Snapshot journalisé une seule fois (pas lors des refresh bouton/WS/poll).



 */







export default function PlayerRoom() {



  const router = useRouter();



  const { playerId } = useParams<{ playerId: string }>();



  const pid = useMemo(() => String(playerId || "").trim(), [playerId]);







  const { pushEvent, addClue, setEvents, reset } = useGameActions();











  const [loading, setLoading] = useState(true);



  const [errorMsg, setErrorMsg] = useState<string | null>(null);







  const [phase, setPhase] = useState<string>("JOIN");



  const [locked, setLocked] = useState<boolean>(false);



  const [me, setMe] = useState<{



    player_id: string;



    name: string;



    character_id?: string | null;



    character_name?: string | null;



    envelopes: { num: number; id: string }[];



  } | null>(null);



  const [role, setRole] = useState<string | null>(null);



  const [mission, setMission] = useState<Mission | null>(null);



  const [showRole, setShowRole] = useState(false);



  const [showMission, setShowMission] = useState(false);







  const loggedSnapshotOnce = useRef(false);
  const seenEvents = useRef<Set<string>>(new Set());
  const lastEventsTsRef = useRef<number | null>(null);
  const EVENT_HISTORY_LIMIT = 200;

  const replaceEvents = useCallback(
    (events: GameEvent[]) => {
      setEvents(events);
      seenEvents.current = new Set(events.map((event) => event.id));
    },
    [setEvents]
  );

  const recordEvent = useCallback(
    (event: GameEvent) => {
      if (!event?.id) return;
      if (seenEvents.current.has(event.id)) return;
      seenEvents.current.add(event.id);
      pushEvent(event);
    },
    [pushEvent]
  );

  const syncEvents = useCallback(
    async (resetHistory: boolean) => {
      if (!pid) return;
      try {
        const since =
          !resetHistory && lastEventsTsRef.current != null
            ? lastEventsTsRef.current
            : undefined;
        const res = await api.getGameEvents({
          playerId: pid,
          sinceTs: since,
          limit: EVENT_HISTORY_LIMIT,
        });

        let latestTs =
          res && typeof res.latest_ts === "number" ? res.latest_ts : undefined;

        if (res?.events?.length) {
          const normalized: GameEvent[] = res.events.map((evt) => ({
            id: evt.id,
            type: evt.type ?? "event",
            payload: evt.payload ?? {},
            ts:
              typeof evt.ts === "number"
                ? Math.floor(evt.ts * 1000)
                : Date.now(),
          }));

          replaceEvents(normalized);

          if (latestTs === undefined) {
            const last = res.events[res.events.length - 1];
            if (last && typeof last.ts === "number") {
              latestTs = last.ts;
            }
          }
        } else if (resetHistory) {
          replaceEvents([]);
          seenEvents.current.clear();
        }

        if (typeof latestTs === "number") {
          lastEventsTsRef.current = latestTs;
        } else if (resetHistory) {
          lastEventsTsRef.current = since ?? null;
        }
      } catch (error) {
        console.error("Failed to sync events", error);
      }
    },
    [pid, replaceEvents]
  );

  useEffect(() => {
    reset();
    seenEvents.current.clear();
    lastEventsTsRef.current = null;
    loggedSnapshotOnce.current = false;
  }, [pid, reset]);

  useEffect(() => {
    return () => {
      reset();
      seenEvents.current.clear();
      lastEventsTsRef.current = null;
    };
  }, [reset]);







  const load = useCallback(
    async ({ logSnapshot }: { logSnapshot: boolean }) => {
      if (!pid) {
        return;
      }

      try {
        setErrorMsg(null);
        setLoading(true);

        const resetHistory = logSnapshot || lastEventsTsRef.current === null;
        await syncEvents(resetHistory);

        const state = await api.getGameState(pid);

        setPhase(String(state.phase_label ?? "JOIN"));
        setLocked(Boolean(state.join_locked));

        if (!state.me) {
          throw new Error("Joueur introuvable (me). Vérifie l’identifiant.");
        }

        const nextMe = {
          player_id: state.me.player_id,
          name: state.me.name || "",
          character_id: state.me.character_id ?? null,
          character_name: state.me.character_name ?? null,
          envelopes: Array.isArray(state.me.envelopes) ? state.me.envelopes : [],
        };

        setMe(nextMe);

        if (state.me.role) {
          setRole(String(state.me.role));
          setShowRole(false);
          localStorage.setItem("mp_role", String(state.me.role));
        }

        if (state.me.mission && typeof state.me.mission === "object") {
          setMission(state.me.mission as Mission);
          setShowMission(false);
          localStorage.setItem("mp_mission", JSON.stringify(state.me.mission));
        }

        if (logSnapshot && !loggedSnapshotOnce.current) {
          recordEvent({
            id: crypto.randomUUID(),
            type: "state_snapshot",
            payload: { phase: state.phase_label, join_locked: state.join_locked, me: nextMe },
            ts: Date.now(),
          });
          loggedSnapshotOnce.current = true;
        }
      } catch (error: any) {
        setErrorMsg(error?.message ?? "Impossible de charger la page joueur.");
      } finally {
        setLoading(false);
      }
    },
    [pid, syncEvents, recordEvent]
  );
  useEffect(() => {



    if (!pid) {



      router.replace("/join");



      return;



    }



    localStorage.setItem("player_id", pid);



  }, [pid, router]);







  useEffect(() => {



    if (typeof window === "undefined") return;



    const storedRole = localStorage.getItem("mp_role");



    if (storedRole) setRole(storedRole);



    const storedMission = localStorage.getItem("mp_mission");



    if (storedMission) {



      try {



        const parsed = JSON.parse(storedMission);



        if (parsed && typeof parsed === "object") setMission(parsed);



      } catch {



        /* ignore */



      }



    }



  }, [pid]);







  useEffect(() => {



    if (!pid) return;



    let alive = true;







    load({ logSnapshot: true });







    void connect(pid);







    const offEvent = on("event", (payload: any) => {



      if (!alive) return;



      const t = payload?.kind ?? "event";



      recordEvent({ id: crypto.randomUUID(), type: t, payload, ts: Date.now() });







      if (payload?.kind === "phase_change" && payload?.phase) {



        setPhase(String(payload.phase));



        load({ logSnapshot: false });



      }







      if (payload?.kind === "envelopes_update") {



        const p = payload as any;



        if (p?.player_id && p.player_id === pid && Array.isArray(p.envelopes)) {



          setMe((prev) => (prev ? { ...prev, envelopes: p.envelopes } : prev));



        } else {



          load({ logSnapshot: false });



        }



      }



    });







    const offPhase = on("event:phase_change", (ev: any) => {



      if (!alive) return;



      if (ev?.phase) {



        setPhase(String(ev.phase));



        load({ logSnapshot: false });



      }



    });







    const offEnv = on("event:envelopes_update", (ev: any) => {



      if (!alive) return;



      if (ev?.player_id && ev.player_id === pid && Array.isArray(ev.envelopes)) {



        setMe((prev) => (prev ? { ...prev, envelopes: ev.envelopes } : prev));



      } else {



        load({ logSnapshot: false });



      }



    });







    const offClue = on("clue", (payload: any) => {



      if (!alive) return;



      const mapKind = (k: string) =>



        k === "crucial" ? "crucial" : k === "red_herring" ? "decoratif" : "ambigu";



      addClue({



        id: crypto.randomUUID(),



        text: payload?.text ?? "Indice",



        kind: mapKind(payload?.kind || "") as any,



      });



      recordEvent({ id: crypto.randomUUID(), type: "clue", payload, ts: Date.now() });



      void syncEvents(false);



    });







    const offIdentified = on("identified", () => {



      if (!alive) return;



      recordEvent({ id: crypto.randomUUID(), type: "identified", payload: { playerId: pid }, ts: Date.now() });



    });







    const offRole = on("role_reveal", (payload: any) => {



      if (!alive) return;



      const nextRole = typeof payload?.role === "string" ? payload.role : null;



      if (nextRole) {



        setRole(nextRole);



        setShowRole(false);



        localStorage.setItem("mp_role", nextRole);



        recordEvent({ id: crypto.randomUUID(), type: "role_reveal", payload, ts: Date.now() });



        void syncEvents(false);



      }



    });







    const offMission = on("secret_mission", (payload: any) => {



      if (!alive) return;



      if (payload && typeof payload === "object") {



        setMission(payload);



        setShowMission(false);



        localStorage.setItem("mp_mission", JSON.stringify(payload));



        recordEvent({ id: crypto.randomUUID(), type: "secret_mission", payload, ts: Date.now() });



        void syncEvents(false);



      }



    });







    const offReconnect = on("ws:reconnect", () => {



      if (!alive) return;



      load({ logSnapshot: false });



    });







    const poll = setInterval(() => {



      if (!isConnected()) load({ logSnapshot: false });



    }, 15_000);







    return () => {



      alive = false;



      offEvent();



      offPhase();



      offEnv();



      offClue();



      offIdentified();



      offRole();



      offMission();



      offReconnect();



      clearInterval(poll);



    };



  }, [pid, load, recordEvent, addClue, syncEvents]);







  function leave() {



    localStorage.removeItem("player_id");



    localStorage.removeItem("mp_role");



    localStorage.removeItem("mp_mission");



    router.replace("/join");



  }







  return (



    <div className="min-h-screen bg-neutral-950 text-neutral-100">



      <StatusBar



        role={showRole ? (role as "killer" | "innocent" | null) : null}



        hasMission={showMission && Boolean(mission)}



      />



      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-4">



        <section className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">



          <div className="flex items-center justify-between mb-3">



            <h2 className="text-lg font-medium">Flux d’événements</h2>



            <div className="flex items-center gap-2">



              <button



                className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm"



                onClick={() => load({ logSnapshot: false })}



              >



                Recharger



              </button>



              <button



                className="px-3 py-2 rounded-md bg-rose-700 hover:bg-rose-600 text-white text-sm"



                onClick={leave}



              >



                Quitter



              </button>



            </div>



          </div>







          {loading && <div className="text-sm text-neutral-300">Chargement</div>}



          {errorMsg && !loading && (



            <div className="rounded-lg border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200 mb-3">



              {errorMsg}



            </div>



          )}







          <EventFeed />



        </section>







        <aside className="space-y-4 rounded-xl border border-subtle bg-raised p-4" aria-label="Informations joueur">

          <div className="space-y-3">

            <div className="text-xs text-muted">

              Phase : <span className="font-semibold text-neutral-100">{phase}</span>{" "}

              Inscriptions :{" "}

              <span className={locked ? "text-danger" : "text-success"}>

                {locked ? "fermées" : "ouvertes"}

              </span>

            </div>

            <div className="flex items-center gap-4">

              <div className="size-12 shrink-0 rounded-lg bg-surface" aria-hidden />

              <div className="space-y-1">

                <div className="text-base font-semibold">

                  {me?.name ?? "Joueur"}{" "}

                  {me?.player_id && (

                    <span className="text-xs text-muted">({me.player_id.slice(0, 8)})</span>

                  )}

                </div>

                <div className="text-sm text-muted">

                  Personnage :{" "}

                  <span className="rounded bg-surface px-2 py-0.5 text-neutral-100">

                    {me?.character_name ?? me?.character_id ?? "non assigné"}

                  </span>

                </div>

              </div>

            </div>

          </div>



          <section className="space-y-2 rounded-lg border border-subtle bg-raised p-4" aria-labelledby="player-role-title">

            <div className="flex items-center justify-between">

              <h3 id="player-role-title" className="text-sm font-medium">Mon rôle</h3>

              {role && (

                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    className="focus-ring rounded-md border border-subtle bg-surface px-2 py-0.5 text-xs font-semibold"

                    onClick={() => setShowRole((v) => !v)}

                    aria-expanded={showRole}

                    aria-controls="player-role-details"

                  >

                    {showRole ? "Masquer" : "Afficher"}

                  </button>

                  {showRole && (

                    <span

                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${

                        role === "killer" ? "bg-danger text-white" : "bg-success text-neutral-900"

                      }`}

                    >

                      {role === "killer" ? "Killer" : "Innocent"}

                    </span>

                  )}

                </div>

              )}

            </div>

            <div id="player-role-details" className="text-sm text-muted">

              {!role ? (

                <p>Tu recevras ton rôle dÃ¨s que le MJ l’aura révélé.</p>

              ) : showRole ? (

                <p className="text-neutral-100">Garde ton rôle secret et utilise-le pour orienter l’enquête.</p>

              ) : (

                <p>Appuie sur « Afficher » uniquement lorsque tu es prêt à consulter ton rôle.</p>

              )}

            </div>

          </section>



          <section className="space-y-2 rounded-lg border border-subtle bg-raised p-4" aria-labelledby="player-mission-title">

            <div className="flex items-center justify-between">

              <h3 id="player-mission-title" className="text-sm font-medium">Ma mission</h3>

              {mission && (

                <button

                  type="button"

                  className="focus-ring rounded-md border border-subtle bg-surface px-2 py-0.5 text-xs font-semibold"

                  onClick={() => setShowMission((v) => !v)}

                  aria-expanded={showMission}

                  aria-controls="player-mission-details"

                >

                  {showMission ? "Masquer" : "Afficher"}

                </button>

              )}

            </div>

            <div id="player-mission-details" className="text-sm text-muted">

              {!mission ? (

                <p>En attente de ta mission secrète. Reste à l’écoute !</p>

              ) : showMission ? (

                <div className="space-y-1 text-neutral-100">

                  <p className="text-sm font-semibold">{mission.title ?? "Mission secrète"}</p>

                  <p className="text-sm text-neutral-200 whitespace-pre-line">{mission.text ?? "Accomplis ta mission pour gagner un avantage."}</p>

                </div>

              ) : (

                <p>Appuie sur « Afficher » pour lire ta mission secrète en toute discrÃ©tion.</p>

              )}

            </div>

          </section>



          <div className="space-y-2">

            <div className="text-sm font-semibold">Mes enveloppes</div>

            {!me?.envelopes?.length ? (

              <p className="text-sm text-muted">Aucune enveloppe pour le moment.</p>

            ) : (

              <ul className="grid gap-2 sm:grid-cols-2" aria-label="Liste des enveloppes">

                {me.envelopes.map((envelope) => (

                  <li

                    key={`${envelope.id}-${envelope.num}`}

                    className="space-y-1 rounded-lg border border-subtle bg-surface p-3"

                  >

                    <div className="text-sm font-semibold">Numéro {envelope.num}</div>

                    <div className="text-xs text-muted">

                      Identifiant : <span className="text-neutral-100">{envelope.id}</span>

                    </div>

                  </li>

                ))}

              </ul>

            )}

          </div>

        </aside>



      </main>



    </div>



  );



}









'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBar from "@/components/StatusBar";
import { api } from "@/lib/api";
import { connect, isConnected, on } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import PlayerClues from "@/components/PlayerClues";
import EventFeed from "@/components/EventFeed";

/**
 * Room Joueur
 * - Snapshot initial via GET /game/state?player_id=...
 * - WS: "event" (générique), "clue", "event:phase_change", "event:envelopes_update"
 * - MAJ enveloppes immédiate si payload contient {player_id, envelopes}, sinon fallback fetch.
 * - Poll fallback si WS down.
 * - Snapshot loggé une seule fois (pas lors des refresh bouton/WS/poll).
 */

export default function PlayerRoom() {
  const router = useRouter();
  const { playerId } = useParams<{ playerId: string }>();
  const pid = useMemo(() => String(playerId || "").trim(), [playerId]);

  const pushEvent = useGameStore((s) => s.pushEvent);
  const addIndice = useGameStore((s) => s.addIndice);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [phase, setPhase] = useState<string>("JOIN");
  const [locked, setLocked] = useState<boolean>(false);
  const [me, setMe] = useState<{
    player_id: string;
    name: string;
    character_id?: string | null;
    envelopes: { num: number; id: string }[];
  } | null>(null);

  const loggedSnapshotOnce = useRef(false);

  // Snapshot loader
  async function load({ logSnapshot }: { logSnapshot: boolean }) {
    if (!pid) return;
    try {
      setErrorMsg(null);
      setLoading(true);
      const s = await api.getGameState(pid);
      setPhase(String(s.phase_label ?? "JOIN"));
      setLocked(Boolean(s.join_locked));

      if (!s.me) throw new Error("Joueur introuvable (me). Vérifie l'identifiant.");
      const nextMe = {
        player_id: s.me.player_id,
        name: s.me.name || "",
        character_id: s.me.character_id ?? null,
        envelopes: Array.isArray(s.me.envelopes) ? s.me.envelopes : [],
      };
      setMe(nextMe);

      if (logSnapshot && !loggedSnapshotOnce.current) {
        pushEvent({
          id: crypto.randomUUID(),
          type: "state_snapshot",
          payload: { phase: s.phase_label, join_locked: s.join_locked, me: nextMe },
          ts: Date.now(),
        });
        loggedSnapshotOnce.current = true;
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Impossible de charger la page joueur.");
    } finally {
      setLoading(false);
    }
  }

  // Enregistrer localement l’ID pour “reprendre ma partie”
  useEffect(() => {
    if (!pid) {
      router.replace("/join");
      return;
    }
    localStorage.setItem("player_id", pid);
  }, [pid, router]);

  useEffect(() => {
    if (!pid) return;
    let alive = true;

    // 1) load initial (log snapshot une seule fois)
    load({ logSnapshot: true });

    // 2) WS connect + listeners
    connect(pid);

    // event générique
    const offEvent = on("event", (payload: any) => {
      if (!alive) return;
      const t = payload?.kind ?? "event";
      pushEvent({ id: crypto.randomUUID(), type: t, payload, ts: Date.now() });

      if (payload?.kind === "phase_change" && payload?.phase) {
        setPhase(String(payload.phase));
        // recharger silencieusement (pas de snapshot)
        load({ logSnapshot: false });
      }

      if (payload?.kind === "envelopes_update") {
        // Si le payload contient déjà les enveloppes pour CE joueur → MAJ locale directe
        const p = payload as any;
        if (p?.player_id && p.player_id === pid && Array.isArray(p.envelopes)) {
          setMe((prev) => (prev ? { ...prev, envelopes: p.envelopes } : prev));
        } else {
          // sinon, fallback fetch silencieux
          load({ logSnapshot: false });
        }
      }
    });

    // événements spécifiques (si émis par ton WS)
    const offPhase = on("event:phase_change", (ev: any) => {
      if (!alive) return;
      if (ev?.phase) {
        setPhase(String(ev.phase));
        load({ logSnapshot: false });
      }
    });

    const offEnv = on("event:envelopes_update", (ev: any) => {
      if (!alive) return;
      // même logique: MAJ immédiate si payload contient les enveloppes du joueur
      if (ev?.player_id && ev.player_id === pid && Array.isArray(ev.envelopes)) {
        setMe((prev) => (prev ? { ...prev, envelopes: ev.envelopes } : prev));
      } else {
        load({ logSnapshot: false });
      }
    });

    // indices ciblés
    const offClue = on("clue", (payload: any) => {
      if (!alive) return;
      const mapKind = (k: string) => (k === "crucial" ? "crucial" : k === "red_herring" ? "decoratif" : "ambigu");
      addIndice({ id: crypto.randomUUID(), text: payload?.text ?? "Indice", kind: mapKind(payload?.kind || "") as any });
      pushEvent({ id: crypto.randomUUID(), type: "clue", payload, ts: Date.now() });
    });

    // ack identification (optionnel)
    const offIdentified = on("identified", () => {
      if (!alive) return;
      pushEvent({ id: crypto.randomUUID(), type: "identified", payload: { playerId: pid }, ts: Date.now() });
    });

    // 3) Fallback poll si WS down
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
      clearInterval(poll);
    };
  }, [pid, pushEvent, addIndice]);

  function leave() {
    localStorage.removeItem("player_id");
    router.replace("/join");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StatusBar />
      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-4">
        <section className="md:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Flux d'événements</h2>
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

          {loading && <div className="text-sm text-neutral-300">Chargement…</div>}
          {errorMsg && !loading && (
            <div className="rounded-lg border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200 mb-3">{errorMsg}</div>
          )}

          <EventFeed />
        </section>

        <aside className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          {/* Carte joueur */}
          <div className="mb-4">
            <div className="text-xs text-neutral-400 mb-2">
              Phase : <span className="text-neutral-200">{phase}</span> • Inscriptions :{" "}
              <span className={locked ? "text-rose-300" : "text-emerald-300"}>{locked ? "fermées" : "ouvertes"}</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-neutral-800 shrink-0" aria-hidden />
              <div>
                <div className="text-base font-medium">
                  {me?.name ?? "Joueur"} {me?.player_id && <span className="opacity-60 text-xs">({me.player_id.slice(0, 8)}…)</span>}
                </div>
                <div className="text-sm text-neutral-300">
                  Personnage : <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-100">{me?.character_id ?? "non assigné"}</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-medium mb-1">Mes enveloppes</div>
              {!me?.envelopes?.length ? (
                <div className="text-sm text-neutral-400">Aucune enveloppe pour le moment.</div>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-2">
                  {me.envelopes.map((e) => (
                    <li key={`${e.id}-${e.num}`} className="rounded-md border border-neutral-800 bg-neutral-950/60 p-3">
                      <div className="text-sm">
                        <span className="opacity-70">Numéro</span> <span className="font-semibold">{e.num}</span>
                      </div>
                      <div className="text-xs text-neutral-400">
                        id: <span className="text-neutral-300">{e.id}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Indices joueur — on retire le titre local pour éviter le doublon */}
          <div className="border-t border-neutral-800 pt-3">
            <PlayerClues />
          </div>
        </aside>
      </main>
    </div>
  );
}

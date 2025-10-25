'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/StatusBar";
import MasterControls from "@/components/MasterControls";
import { api, GameState, PartyStatus } from "@/lib/api";
import { connect, on } from "@/lib/socket";

type Canon = {
  weapon?: string | null;
  location?: string | null;
  motive?: string | null;
  culprit_name?: string | null;
  culprit_player_id?: string | null;
};

type PlayerCard = {
  player_id: string;
  name: string;
  character_id?: string | null;
  character_name?: string | null;
  envelopes: number;
  role?: "killer" | "innocent" | null;
};

export default function MasterDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  const [phase, setPhase] = useState<string>("JOIN");
  const [joinLocked, setJoinLocked] = useState<boolean>(false);
  const [envelopesInfo, setEnvelopesInfo] = useState({
    total: 0,
    assigned: 0,
    left: 0,
  });
  const [canon, setCanon] = useState<Canon | null>(null);
  const [players, setPlayers] = useState<PlayerCard[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [showRoles, setShowRoles] = useState(false);

  const rolesAvailable = useMemo(
    () => players.some((p) => p.role),
    [players],
  );

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setDataError(null);

      const [statusRes, gameState, envSummary, canonRes] = await Promise.all([
        api.partyStatus(),
        api.getGameState(),
        api.envelopesSummary(),
        api.getCanon().catch(() => null),
      ]);

      const status: PartyStatus = statusRes;
      const state: GameState = gameState;
      const summary = envSummary ?? {};
      const canonData: Canon | null = canonRes;

      setPhase(String(status.phase_label ?? "JOIN"));
      setJoinLocked(Boolean(status.join_locked));
      setEnvelopesInfo({
        total: summary.total ?? 0,
        assigned: summary.assigned ?? 0,
        left: summary.left ?? 0,
      });
      setCanon(canonData);

      const perPlayer: Record<string, number> =
        (summary.per_player as Record<string, number>) ?? {};
      const killerId =
        canonData && canonData.culprit_player_id
          ? String(canonData.culprit_player_id)
          : null;
      const rolesAreSet =
        Boolean(killerId) && String(status.phase_label) === "ROLES_ASSIGNED";

      const mappedPlayers: PlayerCard[] = (state.players ?? []).map((p) => {
        const envelopeCount =
          typeof perPlayer[p.player_id] === "number"
            ? perPlayer[p.player_id]
            : 0;
        const role =
          rolesAreSet && killerId
            ? (p.player_id === killerId ? "killer" : "innocent")
            : null;
        return {
          player_id: p.player_id,
          name: p.name ?? "",
          character_id: p.character_id ?? null,
          character_name: p.character_name ?? null,
          envelopes: envelopeCount,
          role,
        };
      });

      setPlayers(mappedPlayers);
      if (!rolesAreSet) {
        setShowRoles(false);
      }
    } catch (error: any) {
      setDataError(error?.message ?? "Impossible de récupérer les données.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.partyStatus();
        if (!alive) return;
        setReady(true);
      } catch (error: any) {
        if (!alive) return;
        setAuthErr(error?.message ?? "401");
        router.replace("/mj/login");
      }
    })();

    connect();
    return () => {
      alive = false;
    };
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    loadData();
  }, [ready, loadData]);

  useEffect(() => {
    if (!ready) return;
    const offPhase = on("event:phase_change", () => loadData());
    const offEnv = on("event:envelopes_update", () => loadData());
    const offRoles = on("event:roles_assigned", () => loadData());
    return () => {
      offPhase();
      offEnv();
      offRoles();
    };
  }, [ready, loadData]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-neutral-400 text-sm">
          {authErr ? "Redirection vers /mj/login..." : "Vérification de session..."}
        </div>
      </div>
    );
  }

  async function logout() {
    await api.mjLogout();
    router.replace("/mj/login");
  }

  const envelopesStats = `${envelopesInfo.assigned}/${envelopesInfo.total} assignées • ${envelopesInfo.left} restantes`;
  const killerCard = players.find((p) => p.role === "killer");
  const killerName =
    canon?.culprit_name ||
    killerCard?.character_name ||
    killerCard?.name ||
    null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StatusBar />
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tableau de bord MJ</h1>
            <p className="text-sm text-neutral-400">
              Phase actuelle : {phase} • Inscriptions{" "}
              {joinLocked ? "fermées" : "ouvertes"}
            </p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm"
          >
            Se déconnecter
          </button>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
          <MasterControls onActionDone={loadData} />
        </div>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Canon (spoilers)</h2>
              <button
                onClick={() => setShowSpoilers((v) => !v)}
                className="text-sm px-3 py-1 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                {showSpoilers ? "Masquer les spoilers" : "Afficher les spoilers"}
              </button>
            </div>
            {!showSpoilers ? (
              <div className="text-sm text-neutral-400">
                Les informations sensibles sont masquées.
              </div>
            ) : canon ? (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-400">Arme :</span>{" "}
                  <span className="text-neutral-100">{canon.weapon ?? "?"}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Lieu :</span>{" "}
                  <span className="text-neutral-100">
                    {canon.location ?? "?"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Mobile :</span>{" "}
                  <span className="text-neutral-100">{canon.motive ?? "?"}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Coupable :</span>{" "}
                  <span className="text-neutral-100">
                    {killerName ?? "Non défini"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-neutral-400">
                Aucun canon généré pour le moment.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Joueurs</h2>
                <p className="text-xs text-neutral-400">{envelopesStats}</p>
              </div>
              <button
                onClick={() => setShowRoles((v) => !v)}
                disabled={!rolesAvailable}
                className="text-sm px-3 py-1 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showRoles ? "Masquer les rôles" : "Afficher les rôles"}
              </button>
            </div>
            {loadingData && (
              <div className="text-sm text-neutral-400">Mise à jour…</div>
            )}
            {dataError && (
              <div className="rounded-md border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200">
                {dataError}
              </div>
            )}
            {!players.length && !loadingData ? (
              <div className="text-sm text-neutral-400">
                Aucun joueur inscrit pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {players.map((player) => {
                  const initials =
                    player.name?.trim()?.slice(0, 2).toUpperCase() ||
                    player.player_id.slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={player.player_id}
                      className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950/60 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-neutral-800 text-sm font-semibold text-neutral-100">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-100">
                            {player.name || "Joueur"}{" "}
                            <span className="opacity-60 text-xs">
                              ({player.player_id.slice(0, 6)}…)
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400">
                            Personnage :{" "}
                            <span className="text-neutral-200">
                              {player.character_name ?? player.character_id ?? "non assigné"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-neutral-300">
                          Enveloppes :{" "}
                          <span className="font-semibold text-neutral-100">
                            {player.envelopes}
                          </span>
                        </span>
                        {showRoles && player.role && (
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              player.role === "killer"
                                ? "bg-rose-900/70 text-rose-200"
                                : "bg-emerald-900/60 text-emerald-200"
                            }`}
                          >
                            {player.role === "killer" ? "Killer" : "Innocent"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

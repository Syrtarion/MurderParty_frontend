'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/StatusBar";
import MasterControls from "@/components/MasterControls";
import {
  api,
  GameState,
  PartyStatus,
  SessionStatus,
  PreparedRound,
  setSessionId as setApiSessionId,
} from "@/lib/api";
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

type IntroState = {
  status: string;
  title?: string | null;
  text?: string | null;
  prepared_at?: number | null;
  confirmed_at?: number | null;
  error?: string | null;
};

export default function MasterDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  const [sessionIdValue, setSessionIdValue] = useState<string>("default");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [preparedRound, setPreparedRound] = useState<PreparedRound | null>(null);
  const [latestAssets, setLatestAssets] = useState<PreparedRound | null>(null);
  const [hintsHistory, setHintsHistory] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [introInfo, setIntroInfo] = useState<IntroState | null>(null);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const introTextRef = useRef<string | null>(null);

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
  const [bootstrapped, setBootstrapped] = useState(false);
  const [resettingSession, setResettingSession] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const storedSession = window.localStorage.getItem("mp_session_id");
    const storedJoin = window.localStorage.getItem("mp_join_code");
    if (storedJoin) {
      setJoinCode(storedJoin.trim());
    }

    const bootstrap = async () => {
      if (storedSession && storedSession.trim() && storedSession.trim() !== "default") {
        const normalized = storedSession.trim();
        if (!cancelled) {
          setSessionIdValue(normalized);
          setApiSessionId(normalized);
          setBootstrapped(true);
        }
        return;
      }

      try {
        const created = await api.createSession();
        if (cancelled) return;

        if (created?.session_id) {
          const newId = created.session_id;
          setSessionIdValue(newId);
          setApiSessionId(newId);
          window.localStorage.setItem("mp_session_id", newId);
        } else {
          setSessionIdValue("default");
        }

        if (created?.join_code) {
          const code = created.join_code.trim().toUpperCase();
          setJoinCode(code);
          window.localStorage.setItem("mp_join_code", code);
        }
      } catch (error) {
        console.error("Failed to initialise session", error);
        if (!cancelled) {
          setSessionIdValue("default");
        }
      } finally {
        if (!cancelled) {
          setBootstrapped(true);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionIdValue === "default") {
      return;
    }
    setApiSessionId(sessionIdValue);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mp_session_id", sessionIdValue);
    }
  }, [sessionIdValue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (joinCode) {
      window.localStorage.setItem("mp_join_code", joinCode);
    }
  }, [joinCode]);

  useEffect(() => {
    if (sessionIdValue === "default") {
      return;
    }
    setSessionStatus(null);
    setPreparedRound(null);
    setLatestAssets(null);
    setHintsHistory([]);
    setJoinCode(null);
  }, [sessionIdValue]);

  const rolesAvailable = useMemo(
    () => players.some((p) => p.role),
    [players],
  );

  const preparedRiddle = useMemo(() => {
    const assets = (preparedRound?.llm_assets ?? {}) as Record<string, any>;
    const riddle = assets?.riddle;
    return riddle && typeof riddle === "object" ? (riddle as Record<string, any>) : null;
  }, [preparedRound]);

  const preparedHints = useMemo(() => {
    const assets = (preparedRound?.llm_assets ?? {}) as Record<string, any>;
    const hintsContainer = assets?.hints;
    const rawHints =
      hintsContainer && typeof hintsContainer === "object"
        ? (hintsContainer as Record<string, any>).hints ?? hintsContainer
        : null;

    if (!rawHints || typeof rawHints !== "object") {
      return [] as Array<{ label: string; text: string }>;
    }

    const collected: Array<{ label: string; text: string }> = [];

    const extractText = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        if (typeof value.text === "string") return value.text;
        if (typeof value.tier === "string") return value.tier;
        if (typeof value.hint === "string") return value.hint;
      }
      return null;
    };

    Object.entries(rawHints as Record<string, any>).forEach(([tierGroup, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry, idx) => {
          const text = extractText(entry);
          if (text) {
            const label = value.length > 1 ? `${tierGroup} #${idx + 1}` : tierGroup;
            collected.push({ label, text });
          }
        });
      } else {
        const text = extractText(value);
        if (text) {
          collected.push({ label: tierGroup, text });
        }
      }
    });

    return collected;
  }, [preparedRound]);

  const refreshHints = useCallback(async () => {
    try {
      const res = await api.listSessionHints({ sessionId: sessionIdValue });
      const list = Array.isArray(res?.hints) ? res.hints : [];
      setHintsHistory(list);
    } catch (error) {
      console.warn("Impossible de recuperer l'historique des indices", error);
    }
  }, [sessionIdValue]);

  const nextRoundLabel = useMemo(() => {
    if (!sessionStatus?.next_round) return null;
    const info = sessionStatus.next_round as Record<string, any>;
    return info.mini_game ?? info.code ?? `Round #${(sessionStatus.round_index ?? 0) + 1}`;
  }, [sessionStatus]);

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      setDataError(null);

      if (!sessionIdValue || sessionIdValue === "default") {
        throw new Error("Session MJ non initialisée");
      }
      setApiSessionId(sessionIdValue);

      const [statusRes, gameState, envSummary, canonRes, sessionState, hintsRes] = await Promise.all([
        api.partyStatus(),
        api.getGameState(),
        api.envelopesSummary(),
        api.getCanon().catch(() => null),
        api.sessionStatus(),
        api.listSessionHints().catch(() => ({ hints: [] })),
      ]);

      const status: PartyStatus = statusRes;
      const state: GameState = gameState;
      if (status?.join_code) {
        setJoinCode(status.join_code);
      }
      const summary = envSummary ?? {};
      const canonData: Canon | null = canonRes;
      const sessionSnapshot: SessionStatus = sessionState;

      setSessionStatus(sessionSnapshot);
      if (sessionSnapshot?.join_code) {
        setJoinCode(sessionSnapshot.join_code);
      }
      const hintsList = Array.isArray(hintsRes?.hints) ? hintsRes.hints : [];
      setHintsHistory(hintsList);
      setPreparedRound((sessionSnapshot.prepared_round as PreparedRound) ?? null);
      setLatestAssets(null);
      const introFromSession = (sessionSnapshot?.intro as IntroState | null) ?? null;
      const introFromParty = (status?.intro as IntroState | null) ?? null;
      const mergedIntro = introFromSession?.status ? introFromSession : introFromParty;
      const shouldDisplayIntro =
        Boolean(mergedIntro?.status) &&
        mergedIntro!.status !== "pending";

      if (shouldDisplayIntro && mergedIntro) {
        setIntroInfo(mergedIntro);
        if (
          mergedIntro.status !== "error" &&
          mergedIntro.text &&
          mergedIntro.text !== introTextRef.current
        ) {
          introTextRef.current = mergedIntro.text;
          setShowIntroModal(true);
        }
      } else {
        setIntroInfo(null);
        introTextRef.current = null;
        setShowIntroModal(false);
      }

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

      const statusPlayers = Array.isArray(status.players) ? status.players : [];
      const statePlayers = Array.isArray((state as any)?.players)
        ? ((state as any).players as Array<Record<string, any>>)
        : [];

      const mappedPlayers: PlayerCard[] = (statusPlayers.length ? statusPlayers : statePlayers).map(
        (player) => {
          const pid = String(player.player_id);
          const envelopeCount =
            typeof player.envelopes === "number"
              ? player.envelopes
              : (typeof perPlayer[pid] === "number" ? perPlayer[pid] : 0);
          const resolvedRoleRaw = player.role;
          const resolvedRole =
            resolvedRoleRaw === "killer" || resolvedRoleRaw === "innocent"
              ? resolvedRoleRaw
              : rolesAreSet && killerId
                ? (pid === killerId ? "killer" : "innocent")
                : null;

          return {
            player_id: pid,
            name: player.name ?? "",
            character_id: player.character_id ?? null,
            character_name: player.character_name ?? null,
            envelopes: envelopeCount,
            role: resolvedRole,
          };
        },
      );

      setPlayers(mappedPlayers);
      if (!rolesAreSet) {
        setShowRoles(false);
      }
    } catch (error: any) {
      setDataError(error?.message ?? "Impossible de récupérer les données.");
    } finally {
      setLoadingData(false);
    }
  }, [sessionIdValue]);

  const handleResetSession = useCallback(async () => {
    if (resettingSession || !sessionIdValue || sessionIdValue === "default") {
      return;
    }
    setResettingSession(true);
    try {
      await api.resetSession(sessionIdValue);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem("mp_session_id");
        window.localStorage.removeItem("mp_join_code");
      }

      const created = await api.createSession();
      if (created?.session_id) {
        const newId = created.session_id;
        setSessionIdValue(newId);
        setApiSessionId(newId);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("mp_session_id", newId);
        }
      } else {
        setSessionIdValue("default");
      }

      if (created?.join_code) {
        const code = created.join_code.trim().toUpperCase();
        setJoinCode(code);
        if (typeof window !== "undefined") {
          window.localStorage.setItem("mp_join_code", code);
        }
      } else {
        setJoinCode(null);
      }
    } catch (error: any) {
      setDataError(error?.message ?? "Impossible de réinitialiser la session.");
    } finally {
      setResettingSession(false);
    }
  }, [resettingSession, sessionIdValue]);

  const handleCopyJoinCode = useCallback(async () => {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopyFeedback("copied");
    } catch (error) {
      console.error("Clipboard copy failed", error);
      setCopyFeedback("error");
    } finally {
      setTimeout(() => setCopyFeedback("idle"), 2000);
    }
  }, [joinCode]);

  useEffect(() => {
    if (!bootstrapped) return;
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
  }, [router, bootstrapped]);

  useEffect(() => {
    if (!ready || sessionIdValue === "default") return;
    loadData();
  }, [ready, loadData, sessionIdValue]);

  useEffect(() => {
    if (!ready) return;
    const offPhase = on("event:phase_change", () => loadData());
    const offEnv = on("event:envelopes_update", () => loadData());
    const offRoles = on("event:roles_assigned", () => loadData());
    const offIntroReady = on("event:session_intro_ready", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      const intro = payload?.intro as IntroState | undefined;
      if (intro) {
        const merged: IntroState = {
          status: intro.status ?? "ready",
          title: intro.title,
          text: intro.text,
          prepared_at: intro.prepared_at,
          confirmed_at: intro.confirmed_at,
          error: intro.error,
        };
        setIntroInfo(merged);
        if (merged.text) {
          introTextRef.current = merged.text;
          setShowIntroModal(true);
        }
        setSessionStatus((prev) => (prev ? { ...prev, intro: merged } : prev));
      }
    });
    const offIntroConfirmed = on("event:session_intro_confirmed", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      const intro = payload?.intro as IntroState | undefined;
      if (intro) {
        const merged: IntroState = {
          status: intro.status ?? "confirmed",
          title: intro.title,
          text: intro.text,
          prepared_at: intro.prepared_at,
          confirmed_at: intro.confirmed_at,
          error: intro.error,
        };
        setIntroInfo(merged);
        if (merged.text && merged.text !== introTextRef.current) {
          introTextRef.current = merged.text;
          setShowIntroModal(true);
        }
        setSessionStatus((prev) => (prev ? { ...prev, intro: merged } : prev));
      }
    });
    const offIntroFailed = on("event:session_intro_failed", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      const merged: IntroState = {
        status: "error",
        error: String(payload?.error ?? "Echec de génération de l'introduction."),
      };
      setIntroInfo(merged);
      introTextRef.current = null;
      setShowIntroModal(false);
      setSessionStatus((prev) => (prev ? { ...prev, intro: merged } : prev));
    });
    const offRoundPrepared = on("event:round_prepared", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      const prepared = (payload?.prepared ?? payload?.assets) as PreparedRound | undefined;
      if (prepared) {
        setPreparedRound(prepared);
        setSessionStatus((prev) => (prev ? { ...prev, prepared_round: prepared } : prev));
      }
    });
    const offAssetsReady = on("event:round_assets_ready", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      const prepared = (payload?.assets ?? payload?.prepared) as PreparedRound | undefined;
      if (prepared) {
        setLatestAssets(prepared);
        setPreparedRound(prepared);
        setSessionStatus((prev) => (prev ? { ...prev, prepared_round: prepared } : prev));
      }
    });
    const offHintDeliveredEvent = on("event:hint_delivered", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      void refreshHints();
    });
    const offHintDestroyedEvent = on("event:hint_destroyed", (payload: any) => {
      if (payload?.session_id && payload.session_id !== sessionIdValue) return;
      void refreshHints();
    });
    return () => {
      offPhase();
      offEnv();
      offRoles();
      offIntroReady();
      offIntroConfirmed();
      offIntroFailed();
      offRoundPrepared();
      offAssetsReady();
      offHintDeliveredEvent();
      offHintDestroyedEvent();
    };
  }, [ready, loadData, sessionIdValue, refreshHints]);

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

  const envelopesStats = `Enveloppes : ${envelopesInfo.assigned}/${envelopesInfo.total} attribuées • ${envelopesInfo.left} restantes`;
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
            <p className="mt-1 text-xs text-neutral-500">
              Session : <span className="font-mono text-neutral-200">{sessionIdValue}</span>
              {joinCode ? (
                <>
                  {" · "}Code : <span className="font-mono text-neutral-100">{joinCode.toUpperCase()}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            onClick={logout}
            className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm"
          >
            Se déconnecter
          </button>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-medium">Session</h2>
              <p className="text-xs text-neutral-400">
                Identifiant utilisé pour toutes les actions MJ. Une réinitialisation purge uniquement cette session.
              </p>
              {joinCode ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-lg tracking-[0.3em] text-neutral-50">
                    {joinCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="btn-base btn-neutral focus-ring"
                  >
                    {copyFeedback === "copied"
                      ? "Code copié !"
                      : copyFeedback === "error"
                        ? "Copie impossible"
                        : "Copier le code"}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-neutral-500">Le code apparaîtra une fois la session prête.</p>
              )}
              {introInfo && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        introInfo.status === "confirmed"
                          ? "bg-emerald-900/60 text-emerald-200"
                          : introInfo.status === "error"
                            ? "bg-rose-900/60 text-rose-200"
                            : "bg-amber-900/60 text-amber-100"
                      }`}
                    >
                      {introInfo.status === "confirmed"
                        ? "Intro confirmée"
                        : introInfo.status === "error"
                          ? "Erreur intro"
                          : "Intro prête"}
                    </span>
                    {introInfo.confirmed_at && (
                      <span className="text-neutral-500">
                        Validée à {new Date((introInfo.confirmed_at ?? 0) * 1000).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {introInfo.status === "error" && introInfo.error ? (
                    <p className="text-xs text-rose-300">{introInfo.error}</p>
                  ) : null}
                  {introInfo.text && showIntroModal && (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4 space-y-2">
                      <h3 className="text-sm font-semibold text-neutral-100">{introInfo.title ?? "Prologue"}</h3>
                      <p className="text-sm text-neutral-200 whitespace-pre-line">{introInfo.text}</p>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowIntroModal(false)}
                          className="btn-base btn-neutral focus-ring"
                        >
                          Fermer
                        </button>
                      </div>
                    </div>
                  )}
                  {introInfo.text && !showIntroModal && introInfo.status !== "error" && (
                    <button
                      type="button"
                      onClick={() => setShowIntroModal(true)}
                      className="btn-base btn-neutral focus-ring"
                    >
                      {introInfo.status === "confirmed" ? "Relire l\u2019intro" : "Afficher l\u2019intro"}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!loadingData) {
                    void loadData();
                  }
                }}
                className="btn-base btn-neutral focus-ring"
                disabled={loadingData}
              >
                {loadingData ? "Rafraîchissement..." : "Rafraîchir"}
              </button>
              <button
                type="button"
                onClick={() => handleResetSession()}
                className="btn-base btn-danger focus-ring"
                disabled={resettingSession || sessionIdValue === "default"}
              >
                {resettingSession ? "Réinitialisation..." : "Réinitialiser la partie"}
              </button>
            </div>
          </div>
          {sessionStatus && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Phase</p>
                <p className="text-sm font-semibold text-neutral-100">{sessionStatus.phase}</p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Round en cours</p>
                <p className="text-sm font-semibold text-neutral-100">
                  {sessionStatus.current_round?.mini_game ?? sessionStatus.current_round?.code ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Prochain round</p>
                <p className="text-sm font-semibold text-neutral-100">
                  {sessionStatus.next_round?.mini_game ?? sessionStatus.next_round?.code ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">Préparé</p>
                <p className="text-sm font-semibold text-neutral-100">
                  {preparedRound ? `Round #${preparedRound.round_index}` : "Aucun"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
          <MasterControls onActionDone={loadData} sessionStatus={sessionStatus} gamePhase={phase} />
        </div>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Round preparation</h2>
              <span className="text-xs text-neutral-400">{sessionStatus?.next_round ? `Next mini-game: ${nextRoundLabel ?? "round"}` : "No upcoming round"}</span>
            </div>
            {preparedRound ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-neutral-200">Intro narration</p>
                  <p className="text-neutral-300">{preparedRound.narration?.intro_text ?? "—"}</p>
                </div>
                <div>
                  <p className="font-semibold text-neutral-200">Outro narration</p>
                  <p className="text-neutral-300">{preparedRound.narration?.outro_text ?? "—"}</p>
                </div>
                {preparedRiddle && (
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-200">Riddle</p>
                    <p className="text-neutral-100">{preparedRiddle.title ?? "—"}</p>
                    <p className="text-neutral-300">{preparedRiddle.question ?? "—"}</p>
                    <p className="text-neutral-500">Answer: {preparedRiddle.answer ?? "?"}</p>
                    {preparedRiddle.solution_hint && (
                      <p className="text-neutral-500">Hint: {preparedRiddle.solution_hint}</p>
                    )}
                  </div>
                )}
                {preparedHints.length > 0 && (
                  <div className="space-y-1">
                    <p className="font-semibold text-neutral-200">Hints</p>
                    <ul className="space-y-1 text-neutral-300">
                      {preparedHints.map((hint) => (
                        <li key={hint.label}>
                          <span className="text-neutral-400">{hint.label}:</span> {hint.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-neutral-400">Prepare the next round to generate narration and hints.</div>
            )}
            {latestAssets && (
              <div className="rounded-md border border-emerald-700 bg-emerald-900/30 p-3 text-sm text-emerald-200">
                Assets dispatched for round #{latestAssets.round_index}.
              </div>
            )}
          </div>
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

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">Indices partagés</h2>
                <p className="text-xs text-neutral-400">Journal des indices (vue MJ)</p>
              </div>
              <button
                onClick={() => refreshHints()}
                className="text-xs px-3 py-1 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700"
              >
                Rafraîchir
              </button>
            </div>
            {!hintsHistory.length ? (
              <div className="text-sm text-neutral-400">
                Aucun indice distribué pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {hintsHistory.map((hint: any, index: number) => {
                  const createdAt =
                    hint?.created_at && typeof hint.created_at === "number"
                      ? new Date(hint.created_at * 1000)
                      : null;
                  return (
                    <div
                      key={hint?.hint_id ?? `hint-${index}`}
                      className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>
                          Round #{hint?.round_index ?? "?"} · Découvreur :{" "}
                          <span className="text-neutral-100 font-medium">
                            {hint?.discoverer_id ?? "?"}
                          </span>
                        </span>
                        {createdAt && <span>{createdAt.toLocaleTimeString()}</span>}
                      </div>
                      <div className="text-xs text-neutral-300">
                        {hint?.shared ? "Partagé" : "Conservé"}
                        {hint?.destroyed ? " · Détruit" : ""}
                        {hint?.other_tier ? ` · Autres: ${hint.other_tier}` : ""}
                      </div>
                      {Array.isArray(hint?.deliveries) && hint.deliveries.length > 0 && (
                        <ul className="space-y-1 text-xs text-neutral-200">
                          {hint.deliveries.map((delivery: any) => (
                            <li
                              key={`${hint?.hint_id ?? `hint-${index}`}-${delivery.player_id}`}
                            >
                              <span className="font-medium">{delivery.player_id}</span>{" "}
                              → {delivery.tier}
                              {delivery.text ? (
                                <span className="text-neutral-400"> — {delivery.text}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
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



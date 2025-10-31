'use client';

import { ReactNode, useMemo, useState } from "react";
import { api, SessionStatus } from "@/lib/api";

type ButtonTone = "neutral" | "primary" | "danger" | "success";

type ActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  busy?: boolean;
  tone?: ButtonTone;
  disabled?: boolean;
};

function ActionButton({ children, onClick, busy = false, tone = "neutral", disabled = false }: ActionButtonProps) {
  const toneClass: Record<ButtonTone, string> = {
    neutral: "btn-neutral",
    primary: "btn-primary",
    danger: "btn-danger",
    success: "btn-success",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      aria-busy={busy}
      aria-disabled={busy || disabled}
      className={`btn-base focus-ring ${toneClass[tone]}`}
    >
      {busy ? (
        <>
          <span className="sr-only">Action en cours…</span>
          <span aria-hidden="true" className="animate-pulse">Patiente…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

type MasterControlsProps = {
  onActionDone?: () => void;
  sessionStatus?: SessionStatus | null;
  gamePhase?: string | null;
};

type ControlDescriptor = {
  key: string;
  label: string;
  tone: ButtonTone;
  run: () => Promise<unknown>;
  disabled?: boolean;
};

export default function MasterControls({ onActionDone, sessionStatus, gamePhase }: MasterControlsProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("Prêt.");

  async function execute(key: string, label: string, runner: () => Promise<unknown>) {
    setBusyKey(key);
    setMessage("Exécution en cours…");
    try {
      const result = await runner();
      const serialised =
        result && typeof result === "object"
          ? JSON.stringify(result, null, 2)
          : String(result ?? "OK");
      setMessage(`✅ ${label}
${serialised}`);
      onActionDone?.();
    } catch (error: any) {
      setMessage(`❌ ${label}
${error?.message ?? String(error)}`);
    } finally {
      setBusyKey(null);
    }
  }

  const nextRoundNumber = useMemo(() => {
    if (!sessionStatus?.next_round) {
      return null;
    }
    const currentIndex = Number(sessionStatus.round_index ?? 0);
    return currentIndex + 1;
  }, [sessionStatus]);

  const alreadyPrepared =
    nextRoundNumber !== null &&
    sessionStatus?.prepared_round?.round_index === nextRoundNumber;

  const introStatus = sessionStatus?.intro?.status ?? "pending";
  const sessionPhaseRaw = (gamePhase ?? "").trim() || sessionStatus?.phase || "";
  const sessionPhase = sessionPhaseRaw.toUpperCase();

  const controls: ControlDescriptor[] = useMemo(() => {
    const list: ControlDescriptor[] = [
      {
        key: "start",
        label: "Initialiser la partie",
        tone: "primary",
        run: api.partyStart,
      },
      {
        key: "lock",
        label: "Verrouiller les inscriptions",
        tone: "danger",
        run: api.masterLockJoin,
      },
      {
        key: "unlock",
        label: "Déverrouiller les inscriptions",
        tone: "success",
        run: api.masterUnlockJoin,
      },
      {
        key: "envelopes",
        label: "Marquer les enveloppes comme cachées",
        tone: "neutral",
        run: api.postEnvelopesHidden,
      },
      {
        key: "roles",
        label: "Assigner rôles & missions",
        tone: "primary",
        run: api.postRolesAssign,
      },
    ];

    const canLaunch =
      sessionPhase === "ROLES_ASSIGNED" &&
      introStatus !== "preparing" &&
      introStatus !== "confirmed";

    list.push({
      key: "launch",
      label: "Démarrer la partie",
      tone: "primary",
      run: () => api.launchParty(),
      disabled: !canLaunch,
    });

    list.push({
      key: "prepare-round",
      label:
        nextRoundNumber !== null
          ? `Préparer le round #${nextRoundNumber}`
          : "Préparer le prochain round",
      tone: "primary",
      run:
        nextRoundNumber !== null
          ? () => api.prepareRound(nextRoundNumber)
          : async () => {
              throw new Error("Aucun round disponible à préparer");
            },
      disabled: nextRoundNumber === null || alreadyPrepared,
    });

    list.push({
      key: "status",
      label: "Afficher le statut",
      tone: "neutral",
      run: api.partyStatus,
    });

    return list;
  }, [alreadyPrepared, nextRoundNumber, introStatus, sessionPhase]);

  return (
    <section className="space-y-4" aria-labelledby="master-controls-heading">
      <h2 id="master-controls-heading" className="text-sm font-semibold text-muted uppercase tracking-wide">
        Actions MJ
      </h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {controls.map((control) => (
          <ActionButton
            key={control.key}
            tone={control.tone}
            busy={busyKey === control.key}
            disabled={control.disabled ?? false}
            onClick={() => execute(control.key, control.label, control.run)}
          >
            {control.label}
          </ActionButton>
        ))}
      </div>

      <div className="card space-y-2" role="status" aria-live="polite" aria-atomic="true">
        <p className="text-xs font-medium text-muted">Journal</p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-neutral-100">
          {message}
        </pre>
      </div>
    </section>
  );
}

'use client';

import { ReactNode, useMemo, useState } from "react";
import { api } from "@/lib/api";

type ButtonTone = "neutral" | "primary" | "danger" | "success";

type ActionButtonProps = {
  children: ReactNode;
  onClick: () => void;
  busy?: boolean;
  tone?: ButtonTone;
};

function ActionButton({ children, onClick, busy = false, tone = "neutral" }: ActionButtonProps) {
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
      disabled={busy}
      aria-busy={busy}
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
};

type ControlDescriptor = {
  key: string;
  label: string;
  tone: ButtonTone;
  run: () => Promise<unknown>;
};

export default function MasterControls({ onActionDone }: MasterControlsProps) {
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
      setMessage(`✅ ${label}\n${serialised}`);
      onActionDone?.();
    } catch (error: any) {
      setMessage(`❌ ${label}\n${error?.message ?? String(error)}`);
    } finally {
      setBusyKey(null);
    }
  }

  const controls: ControlDescriptor[] = useMemo(
    () => [
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
      {
        key: "session",
        label: "Lancer la session (à venir)",
        tone: "neutral",
        run: async () => {
          throw new Error("Fonctionnalité à venir (Lot C)");
        },
      },
      {
        key: "status",
        label: "Afficher le statut",
        tone: "neutral",
        run: api.partyStatus,
      },
    ],
    []
  );

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

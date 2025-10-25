'use client';

import { ReactNode, useState } from "react";
import { api } from "@/lib/api";

type BtnTone = "neutral" | "primary" | "danger" | "success";

function Btn({
  children,
  onClick,
  busy,
  tone = "neutral",
}: {
  children: ReactNode;
  onClick: () => void;
  busy?: boolean;
  tone?: BtnTone;
}) {
  const toneCls: Record<BtnTone, string> = {
    neutral: "bg-neutral-800 hover:bg-neutral-700 text-neutral-100",
    primary: "bg-blue-600 hover:bg-blue-500 text-white",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    success: "bg-emerald-600 hover:bg-emerald-500 text-white",
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-3 py-2 rounded-md text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${toneCls[tone]}`}
    >
      {busy ? "…" : children}
    </button>
  );
}

type MasterControlsProps = {
  onActionDone?: () => void;
};

export default function MasterControls({ onActionDone }: MasterControlsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(tag: string, fn: () => Promise<any>) {
    setBusy(tag);
    setMsg(null);
    try {
      const result = await fn();
      setMsg(`${tag} • OK\n${JSON.stringify(result, null, 2)}`);
      onActionDone?.();
    } catch (error: any) {
      setMsg(`${tag} • ERREUR : ${error?.message ?? String(error)}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <Btn
          tone="primary"
          busy={busy === "Initialiser"}
          onClick={() => run("Initialiser", api.partyStart)}
        >
          🚀 Initialiser la partie
        </Btn>
        <Btn
          tone="danger"
          busy={busy === "Verrouiller"}
          onClick={() => run("Verrouiller", api.masterLockJoin)}
        >
          🔒 Verrouiller inscriptions
        </Btn>
        <Btn
          tone="success"
          busy={busy === "Déverrouiller"}
          onClick={() => run("Déverrouiller", api.masterUnlockJoin)}
        >
          🔓 Déverrouiller inscriptions
        </Btn>

        <Btn
          busy={busy === "Enveloppes cachées"}
          onClick={() => run("Enveloppes cachées", api.postEnvelopesHidden)}
        >
          📦 Enveloppes cachées
        </Btn>
        <Btn
          busy={busy === "Assigner rôles & missions"}
          onClick={() => run("Assigner rôles & missions", api.postRolesAssign)}
        >
          🧩 Rôles & missions
        </Btn>

        <Btn
          busy={busy === "Démarrer session"}
          onClick={() =>
            run("Démarrer session", async () => {
              throw new Error("À venir (Lot C)");
            })
          }
        >
          🎬 Démarrer session
        </Btn>

        <Btn busy={busy === "Status"} onClick={() => run("Status", api.partyStatus)}>
          🩺 Status
        </Btn>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <div className="text-xs text-neutral-400 mb-2">Journal</div>
        <pre className="text-xs text-neutral-200 overflow-auto whitespace-pre-wrap">
          {msg ?? "…"}
        </pre>
      </div>
    </div>
  );
}

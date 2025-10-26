'use client';

import { useMemo } from "react";
import { useGameClues } from "@/lib/store";
import type { PlayerClue } from "@/lib/types";

const BADGE_STYLE: Record<string, { label: string; cls: string }> = {
  crucial: {
    label: "Crucial",
    cls: "badge--crucial",
  },
  ambigu: {
    label: "Ambigu",
    cls: "badge--ambigu",
  },
  decoratif: {
    label: "Faux-fuyant",
    cls: "badge--faux",
  },
  faux_fuyant: {
    label: "Faux-fuyant",
    cls: "badge--faux",
  },
};

function getBadge(clue: PlayerClue) {
  return BADGE_STYLE[clue.kind] ?? BADGE_STYLE.ambigu;
}

export default function PlayerClues() {
  const clues = useGameClues();
  const ordered = useMemo(() => [...clues].reverse(), [clues]);

  return (
    <div>
      <h3 className="mb-2 font-semibold">Mes indices</h3>
      <ul className="space-y-2">
        {ordered.map((clue) => {
          const badge = getBadge(clue);
          return (
            <li
              key={clue.id}
              className="space-y-2 rounded-xl border border-subtle bg-surface p-3 text-sm"
            >
              <div className={`badge ${badge.cls}`}>{badge.label}</div>
              <p className="mt-2 text-sm leading-relaxed">{clue.text}</p>
            </li>
          );
        })}
        {ordered.length === 0 && (
          <li className="text-sm text-muted">Aucun indice pour l’instant.</li>
        )}
      </ul>
    </div>
  );
}

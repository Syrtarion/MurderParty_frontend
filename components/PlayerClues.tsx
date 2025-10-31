'use client';

import { useMemo } from "react";
import { useGameClues, useGamePlayer } from "@/lib/store";
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
  const player = useGamePlayer();
  const clues = useGameClues();
  const ordered = useMemo(() => [...clues].reverse(), [clues]);

  return (
    <div>
      <h3 className="mb-2 font-semibold">Mes indices</h3>
      <ul className="space-y-2">
        {ordered.map((clue) => {
          const badge = getBadge(clue);
          const isDiscoverer =
            clue.discovererId && clue.discovererId === player?.playerId;
          return (
            <li
              key={clue.id}
              className="space-y-2 rounded-xl border border-subtle bg-surface p-3 text-sm"
            >
              <div className={`badge ${badge.cls}`}>{badge.label}</div>
              <p
                className={`mt-2 text-sm leading-relaxed ${
                  clue.destroyed ? "line-through text-muted" : ""
                }`}
              >
                {clue.text}
              </p>
              <div className="text-xs text-muted space-y-0.5">
                {clue.tier && (
                  <p>
                    Niveau&nbsp;:{" "}
                    <span className="text-neutral-100 font-medium">
                      {clue.tier}
                    </span>
                  </p>
                )}
                {clue.shared !== undefined && (
                  <p>
                    {clue.shared
                      ? "Partagé avec la table"
                      : isDiscoverer
                      ? "Conservé pour toi"
                      : "Version restreinte reçue"}
                  </p>
                )}
                {clue.destroyed && (
                  <p className="text-rose-300">
                    Indice détruit{" "}
                    {clue.destroyedBy ? `par ${clue.destroyedBy}` : ""}
                  </p>
                )}
              </div>
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

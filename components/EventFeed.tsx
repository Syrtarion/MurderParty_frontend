'use client';

import { useMemo } from "react";
import { useGameEvents } from "@/lib/store";
import type { GameEvent } from "@/lib/types";

function titleFor(event: GameEvent): string {
  const payload = (event?.payload ?? {}) as { kind?: string };
  if (event.type === "round_advance" || payload.kind === "round_advance") {
    return "Avancement de manche";
  }
  if (event.type === "identified") {
    return "Connexion confirmée";
  }
  if (payload.kind) {
    return payload.kind.replaceAll("_", " ");
  }
  return event.type ?? "Événement";
}

function subtitleFor(event: GameEvent): string {
  const payload = (event?.payload ?? {}) as {
    step?: number | string;
    text?: string;
  };
  if (payload.step != null) {
    return `Étape : ${payload.step}`;
  }
  if (typeof payload.text === "string" && payload.text.length > 0) {
    return payload.text;
  }
  return "";
}

export default function EventFeed() {
  const events = useGameEvents();
  const ordered = useMemo(() => [...events].reverse(), [events]);

  if (ordered.length === 0) {
    return <div className="text-sm text-muted">Aucun événement pour l'instant.</div>;
  }

  return (
    <div>
      <ul className="space-y-2" aria-live="polite" aria-label="Flux d'événements récents">
        {ordered.map((event) => (
          <li
            key={event.id}
            className="space-y-1 rounded-xl border border-subtle bg-surface p-3"
          >
            <div className="text-sm font-medium">{titleFor(event)}</div>
            {subtitleFor(event) && (
              <div className="text-xs text-muted">{subtitleFor(event)}</div>
            )}
            <div className="text-[10px] text-muted">
              {new Date(event.ts).toLocaleTimeString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

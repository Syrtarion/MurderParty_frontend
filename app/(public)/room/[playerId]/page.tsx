'use client';

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { connect, on } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import PlayerClues from "@/components/PlayerClues";
import EventFeed from "@/components/EventFeed";
import StatusBar from "@/components/StatusBar";

export default function PlayerRoom() {
  const { playerId } = useParams<{ playerId: string }>();
  const pushEvent = useGameStore(s => s.pushEvent);
  const addIndice = useGameStore(s => s.addIndice);

  useEffect(() => {
    connect(playerId);

    // Ton serveur enverra { "type":"event", "payload":{...} }
    const offEvent = on("event", (payload: any) => {
      const t = payload?.kind ?? "event";
      pushEvent({ id: crypto.randomUUID(), type: t, payload, ts: Date.now() });
    });

    // Ton serveur enverra { "type":"clue", "text":"...", "kind":"crucial|ambiguous|red_herring" }
    const offClue = on("clue", (payload: any) => {
      // On mappe tes noms -> notre store (crucial|ambigu|decoratif|faux_fuyant si besoin)
      const mapKind = (k: string) => {
        if (k === "crucial") return "crucial";
        if (k === "ambiguous") return "ambigu";
        if (k === "red_herring") return "decoratif";  // ou "faux_fuyant" selon ton UI
        return "ambigu";
      };
      addIndice({ id: crypto.randomUUID(), text: payload?.text ?? "Indice", kind: mapKind(payload?.kind || "") as any });
    });

    // Optionnel : afficher un toast quand on reçoit "identified" (accusé de réception de l'identify)
    const offIdentified = on("identified", () => {
      pushEvent({ id: crypto.randomUUID(), type: "identified", payload: { playerId }, ts: Date.now() });
    });

    return () => { offEvent(); offClue(); offIdentified(); };
  }, [playerId, pushEvent, addIndice]);

  return (
    <main className="grid md:grid-cols-3 gap-4">
      <section className="md:col-span-2 card">
        <h2 className="text-lg font-medium mb-3">Flux d'événements</h2>
        <EventFeed />
      </section>
      <aside className="card">
        <StatusBar />
        <div className="h-4" />
        <PlayerClues />
      </aside>
    </main>
  );
}

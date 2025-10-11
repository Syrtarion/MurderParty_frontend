'use client';

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/socket";
import { useGameStore } from "@/lib/store";
import PlayerClues from "@/components/PlayerClues";
import EventFeed from "@/components/EventFeed";
import StatusBar from "@/components/StatusBar";

export default function PlayerRoom() {
  const params = useParams();
  const playerId = params?.playerId as string;
  const pushEvent = useGameStore(s=>s.pushEvent);
  const addIndice = useGameStore(s=>s.addIndice);

  useEffect(()=>{
    const s = getSocket();
    function onEvent(payload:any){ pushEvent({ id: crypto.randomUUID(), type: payload?.type ?? 'event', payload, ts: Date.now() }); }
    function onIndice(payload:any){ addIndice({ id: crypto.randomUUID(), text: payload?.text ?? 'Nouvel indice', kind: payload?.kind ?? 'ambigu' }); }
    s.on("event:global", onEvent);
    s.on("indice:new", onIndice);
    s.emit("player:join", { playerId });

    return ()=>{
      s.off("event:global", onEvent);
      s.off("indice:new", onIndice);
    };
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

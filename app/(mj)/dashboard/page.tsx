'use client';

import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import EventFeed from "@/components/EventFeed";
import MasterControls from "@/components/MasterControls";

export default function MasterDashboard() {
  const [connected, setConnected] = useState(false);

  useEffect(()=>{
    const s = getSocket();
    function onConnect(){ setConnected(true); }
    function onDisconnect(){ setConnected(false); }
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    return ()=>{
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  return (
    <main className="grid md:grid-cols-3 gap-4">
      <section className="card md:col-span-1">
        <h2 className="text-lg font-medium mb-3">Panneau de contrôle</h2>
        <p className="text-sm mb-3 opacity-75">Socket: {connected ? "connecté" : "déconnecté"}</p>
        <MasterControls />
      </section>
      <section className="card md:col-span-2">
        <h2 className="text-lg font-medium mb-3">Historique live</h2>
        <EventFeed />
      </section>
    </main>
  );
}

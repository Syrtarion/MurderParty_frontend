'use client';

import { useEffect } from "react";
import { connect } from "@/lib/socket"; // ← ajoute ceci


import EventFeed from "@/components/EventFeed";
import MasterControls from "@/components/MasterControls";
import PlayersList from "@/components/MJ/PlayersList";
import TimelinePanel from "@/components/MJ/TimelinePanel";

export default function MasterDashboard(){
  useEffect(() => {
    connect("__mj__"); // MJ : pas de playerId
  }, []);

  return (
    <main className="grid lg:grid-cols-3 gap-4">
      <section className="card lg:col-span-1">
        <h2 className="text-lg font-medium mb-3">Panneau de contrôle</h2>
        <MasterControls />
        <div className="h-4" />
        <TimelinePanel />
      </section>
      <section className="card lg:col-span-2">
        <h2 className="text-lg font-medium mb-3">Historique live</h2>
        <EventFeed />
        <div className="h-4" />
        <PlayersList />
      </section>
    </main>
  );
}

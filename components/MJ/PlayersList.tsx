'use client';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { on } from "@/lib/socket";

type Player = { id: string; name?: string };

export default function PlayersList(){
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(){
    try{
      const state:any = await api.getGameState();
      const list: Player[] = state?.players ?? state?.room?.players ?? [];
      setPlayers(Array.isArray(list) ? list : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{
    load();
    const off = on("event", (p:any)=>{
      if (p?.kind === "player_joined" || p?.kind === "player_left") load();
    });
    return ()=>{ off(); };
  }, []);

  return (
    <div>
      <h3 className="font-semibold mb-2">Joueurs connectés</h3>
      {loading && <div className="text-xs opacity-70">Chargement…</div>}
      <ul className="mt-2 space-y-2">
        {players.map(pl=>(
          <li key={pl.id} className="p-2 rounded-lg border border-neutral-800 bg-neutral-900/50 text-sm">
            {pl.name ?? pl.id}
          </li>
        ))}
        {!loading && players.length===0 && (
          <li className="text-sm opacity-70">Aucun joueur connecté.</li>
        )}
      </ul>
    </div>
  );
}

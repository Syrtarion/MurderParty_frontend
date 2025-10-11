'use client';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function StatusBar(){
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const s = await api.getGameState();
        if (alive) setState(s);
      } catch {
        // ignore erreurs réseau momentanées
      }
    }

    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);


  return (
    <div>
      <h3 className="font-semibold">État de la partie</h3>
      <div className="text-xs opacity-70 mt-1">Polling / fallback toutes les 15s</div>
      <pre className="text-xs mt-2 opacity-80 overflow-x-auto">{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}

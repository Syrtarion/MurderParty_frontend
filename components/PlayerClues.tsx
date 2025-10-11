'use client';

import { useGameStore } from "@/lib/store";

export default function PlayerClues(){
  const clues = useGameStore(s=>s.clues);
  return (
    <div>
      <h3 className="font-semibold mb-2">Mes indices</h3>
      <ul className="space-y-2">
        {clues.map(c=>(
          <li key={c.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/50">
            <div className="flex items-center justify-between mb-1">
              <span className="badge">{c.kind}</span>
            </div>
            <p className="text-sm leading-relaxed">{c.text}</p>
          </li>
        ))}
        {clues.length===0 && <li className="opacity-70 text-sm">Aucun indice reçu pour l'instant.</li>}
      </ul>
    </div>
  );
}

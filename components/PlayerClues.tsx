'use client';
import { useGameStore } from "@/lib/store";

function badge(kind: string){
  const map: Record<string, {label:string; cls:string}> = {
    crucial: { label: "Crucial",    cls: "bg-emerald-600/20 text-emerald-300 border-emerald-700/50" },
    ambigu:  { label: "Ambigu",     cls: "bg-amber-600/20  text-amber-300  border-amber-700/50" },
    decoratif:{label: "Faux-fuyant",cls: "bg-rose-600/20   text-rose-300   border-rose-700/50" },
  };
  return map[kind] ?? map.ambigu;
}

export default function PlayerClues(){
  const clues = useGameStore(s => s.clues);
  const sorted = [...clues].reverse(); // derniers en premier

  return (
    <div>
      <h3 className="font-semibold mb-2">Mes indices</h3>
      <ul className="space-y-2">
        {sorted.map(c=>{
          const b = badge(c.kind);
          return (
            <li key={c.id} className="p-3 rounded-xl border bg-neutral-900/50 border-neutral-800">
              <div className={`inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border ${b.cls}`}>
                {b.label}
              </div>
              <p className="mt-2 text-sm leading-relaxed">{c.text}</p>
            </li>
          );
        })}
        {sorted.length===0 && <li className="text-sm opacity-70">Aucun indice pour l’instant.</li>}
      </ul>
    </div>
  );
}

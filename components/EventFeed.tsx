'use client';
import { useGameStore } from "@/lib/store";

function titleFor(e:any){
  // tu peux enrichir selon tes events
  if (e.type === "round_advance" || e.payload?.kind === "round_advance") return "→ Avancement de manche";
  if (e.type === "identified") return "Connexion confirmée";
  if (e.payload?.kind) return String(e.payload.kind).replaceAll("_"," ");
  return e.type ?? "Événement";
}

function subtitleFor(e:any){
  if (e.payload?.step != null) return `Étape : ${e.payload.step}`;
  if (typeof e.payload?.text === "string") return e.payload.text;
  return "";
}

export default function EventFeed(){
  const events = useGameStore(s=>s.events);
  const list = [...events].reverse();

  return (
    <div>
      <ul className="space-y-2">
        {list.map(ev=>(
          <li key={ev.id} className="p-3 rounded-xl border bg-neutral-900/50 border-neutral-800">
            <div className="text-sm font-medium">{titleFor(ev)}</div>
            {subtitleFor(ev) && <div className="text-xs opacity-75 mt-1">{subtitleFor(ev)}</div>}
            <div className="text-[10px] opacity-50 mt-1">{new Date(ev.ts).toLocaleTimeString()}</div>
          </li>
        ))}
        {list.length===0 && <li className="text-sm opacity-70">Aucun événement pour l’instant.</li>}
      </ul>
    </div>
  );
}

'use client';

import { useGameStore } from "@/lib/store";

export default function EventFeed(){
  const events = useGameStore(s=>s.events);
  return (
    <ol className="space-y-3">
      {events.map(e=>(
        <li key={e.id} className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/50">
          <div className="text-xs opacity-60">{new Date(e.ts).toLocaleTimeString()}</div>
          <div className="text-sm font-medium">{e.type}</div>
          <pre className="text-xs mt-1 opacity-80 overflow-x-auto">{JSON.stringify(e.payload, null, 2)}</pre>
        </li>
      ))}
      {events.length===0 && <li className="opacity-70 text-sm">Pas encore d'événements.</li>}
    </ol>
  );
}

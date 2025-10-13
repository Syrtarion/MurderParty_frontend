'use client';

import { useState } from "react";
import { api } from "@/lib/api";

export default function MasterControls(){
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(path: string, tag: string, body?: any){
    setBusy(tag); setMsg(null);
    try{
      const r = await api.post<any>(path, body);
      const j = JSON.stringify(r);
      setMsg(`${tag} → OK ${j}`);
    }catch(e:any){
      setMsg(`${tag} → ERREUR: ${e?.message ?? e}`);
    }finally{
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm opacity-75">Orchestration MJ</div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-primary" disabled={busy!==null}
          onClick={()=>call("/party/start","Initialiser")}>
          {busy==="Initialiser"?"…":"🚀 Initialiser la partie"}
        </button>
        <button className="btn" disabled={busy!==null}
          onClick={()=>call("/party/players_ready","Joueurs OK")}>
          {busy==="Joueurs OK"?"…":"👥 Joueurs arrivés"}
        </button>
        <button className="btn" disabled={busy!==null}
          onClick={()=>call("/party/envelopes_done","Enveloppes finies")}>
          {busy==="Enveloppes finies"?"…":"📦 Enveloppes distribuées"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("/master/lock_join","Lock")}>
          {busy==="Lock"?"…":"🔒 Verrouiller inscriptions"}
        </button>
        <button className="btn" disabled={busy!==null}
          onClick={()=>call("/master/unlock_join","Unlock")}>
          {busy==="Unlock"?"…":"🔓 Déverrouiller"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("/party/status","Status")}>
          {busy==="Status"?"…":"🩺 Status"}
        </button>
      </div>

      {msg && <div className="text-xs whitespace-pre-wrap">{msg}</div>}
    </div>
  );
}

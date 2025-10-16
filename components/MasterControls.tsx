'use client';

import { useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");
const MJ_BEARER = process.env.NEXT_PUBLIC_MJ_BEARER?.trim();

async function post<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(MJ_BEARER ? { "Authorization": `Bearer ${MJ_BEARER}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> "");
    throw new Error(txt || res.statusText);
  }
  return res.status === 204 ? (undefined as unknown as T) : await res.json();
}

export default function MasterControls(){
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function call(tag: string, path: string, body?: any) {
    setBusy(tag); setMsg(null);
    try {
      const r = await post<any>(path, body);
      setMsg(`${tag} → OK\n` + JSON.stringify(r, null, 2));
    } catch (e:any) {
      setMsg(`${tag} → ERREUR: ${e?.message ?? e}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm opacity-75">Orchestration MJ</div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn btn-primary" disabled={busy!==null}
          onClick={()=>call("Initialiser","/party/start")}>
          {busy==="Initialiser" ? "…" : "🚀 Initialiser la partie"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("Joueurs OK","/party/players_ready")}>
          {busy==="Joueurs OK" ? "…" : "👥 Joueurs arrivés"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("Enveloppes finies","/party/envelopes_done")}>
          {busy==="Enveloppes finies" ? "…" : "📦 Enveloppes distribuées"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("Lock","/master/lock_join")}>
          {busy==="Lock" ? "…" : "🔒 Verrouiller inscriptions"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("Unlock","/master/unlock_join")}>
          {busy==="Unlock" ? "…" : "🔓 Déverrouiller"}
        </button>

        <button className="btn" disabled={busy!==null}
          onClick={()=>call("Status","/party/status")}>
          {busy==="Status" ? "…" : "🩺 Status"}
        </button>
      </div>

      {msg && <pre className="text-xs whitespace-pre-wrap">{msg}</pre>}
    </div>
  );
}

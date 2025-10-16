'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { connect, on, isConnected } from "@/lib/socket";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");

async function getState(): Promise<any> {
  const res = await fetch(`${API_BASE}/game/state`, { cache: "no-store" });
  if (!res.ok) throw new Error(await res.text().catch(()=>res.statusText));
  return res.json();
}

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text().catch(()=>res.statusText));
  return res.json();
}

export default function JoinPage() {
  const router = useRouter();
  const [phaseLabel, setPhaseLabel] = useState<string>("WAITING_START");
  const [joinLocked, setJoinLocked] = useState<boolean>(true);
  const [tab, setTab] = useState<"create"|"login">("create");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const creationOpen = !joinLocked;

  async function load(){
    try{
      const s = await getState();
      const p = s?.phase_label ?? s?.state?.phase_label ?? s?.phase ?? "WAITING_START";
      const jl = Boolean(s?.join_locked ?? s?.state?.join_locked ?? true);
      setPhaseLabel(String(p));
      setJoinLocked(jl);
      if (jl && tab==="create") setTab("login");
    }catch{}
  }

  useEffect(()=>{
    let alive = true;
    load();
    const ws = connect(); // public: pas d'identification
    const off = on("event", (ev:any)=>{
      if(!alive) return;
      if (ev?.kind === "phase_change" && ev?.phase) setPhaseLabel(String(ev.phase));
      if (ev?.kind === "join_locked"){ setJoinLocked(true); setTab("login"); }
      if (ev?.kind === "join_unlocked"){ setJoinLocked(false); setTab("create"); }
    });
    const id = setInterval(()=>{ if(!isConnected()) load(); }, 5000);
    return ()=>{ alive=false; off(); clearInterval(id); };
  }, [tab]);

  async function doRegister() {
    setLoading(true); setErrorMsg(null);
    try {
      const r:any = await postJson("/auth/register", { name, password });
      const pid = r.player_id || r.id;
      if (!pid) throw new Error("player_id manquant");
      localStorage.setItem("playerId", String(pid));
      router.push(`/room/${pid}`);
    } catch(e:any) {
      setErrorMsg(e?.message || "Impossible de créer le joueur.");
    } finally { setLoading(false); }
  }

  async function doLogin() {
    setLoading(true); setErrorMsg(null);
    try {
      const r:any = await postJson("/auth/login", { name, password });
      const pid = r.player_id || r.id;
      if (!pid) throw new Error("player_id manquant");
      localStorage.setItem("playerId", String(pid));
      router.push(`/room/${pid}`);
    } catch(e:any) {
      setErrorMsg(e?.message || "Connexion impossible. Vérifie nom/mot de passe.");
    } finally { setLoading(false); }
  }

  return (
    <main className="card max-w-md mx-auto">
      <h2 className="text-lg font-medium mb-4">Rejoindre la partie</h2>
      <div className="text-xs opacity-70 mb-3">
        Phase actuelle : {phaseLabel} • Inscriptions : {joinLocked ? "fermées" : "ouvertes"}
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`btn ${tab==="create" ? "btn-primary":""}`} onClick={()=>setTab("create")}
          disabled={!creationOpen} title={creationOpen ? "" : "La création est verrouillée par le MJ."}>
          Créer
        </button>
        <button className={`btn ${tab==="login" ? "btn-primary":""}`} onClick={()=>setTab("login")}>
          Rejoindre
        </button>
      </div>

      {tab==="create" && creationOpen && (
        <form onSubmit={(e)=>{e.preventDefault(); doRegister();}} className="space-y-3">
          <input className="input" placeholder="Pseudo / Nom" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} required />
          {errorMsg && <div className="text-sm text-red-400">{errorMsg}</div>}
          <button className="btn btn-primary" disabled={loading || !name || !password}>
            {loading ? "Création..." : "Créer mon joueur"}
          </button>
        </form>
      )}

      {tab==="login" && (
        <form onSubmit={(e)=>{e.preventDefault(); doLogin();}} className="space-y-3">
          <input className="input" placeholder="Pseudo / Nom" value={name} onChange={e=>setName(e.target.value)} required />
          <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} required />
          {errorMsg && <div className="text-sm text-red-400">{errorMsg}</div>}
          <button className="btn btn-primary" disabled={loading || !name || !password}>
            {loading ? "Connexion..." : "Rejoindre"}
          </button>
        </form>
      )}

      <div className="mt-6">
        <button className="btn" onClick={()=>{
          const saved = localStorage.getItem("playerId");
          if (saved) router.push(`/room/${saved}`);
          else alert("Aucun joueur enregistré sur cet appareil.");
        }}>
          Reprendre ma partie
        </button>
      </div>
    </main>
  );
}

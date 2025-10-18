'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/StatusBar";
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>){
  return <input {...props} className={`w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600 ${props.className||""}`} />;
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>){
  return <button {...props} className={`px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${props.className||""}`} />;
}

function TabBtn({active, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {active?: boolean}){
  const cls = active
    ? "bg-neutral-800 text-neutral-100 border-neutral-700"
    : "bg-neutral-900 text-neutral-300 border-transparent hover:bg-neutral-800";
  return <button {...props} className={`px-3 py-2 rounded-md border text-sm ${cls} transition-colors`} />;
}

export default function JoinPage() {
  const router = useRouter();
  const [phaseLabel, setPhaseLabel] = useState<string>("JOIN");
  const [joinLocked, setJoinLocked] = useState<boolean>(false);
  const [tab, setTab] = useState<"create"|"login">("create");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const creationOpen = !joinLocked;

  async function load(){
    try{
      const s = await getState();
      const p = s?.phase_label ?? "JOIN";
      const jl = Boolean(s?.join_locked ?? false);
      setPhaseLabel(String(p));
      setJoinLocked(jl);
      if (jl && tab==="create") setTab("login");
    }catch{/* no-op */}
  }

  useEffect(()=>{
    const saved = localStorage.getItem("player_id");
    if (saved) router.push(`/room/${saved}`);
  }, [router]);

  useEffect(()=>{
    let alive = true;
    load();

    connect();
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
      localStorage.setItem("player_id", String(pid));
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
      localStorage.setItem("player_id", String(pid));
      router.push(`/room/${pid}`);
    } catch(e:any) {
      setErrorMsg(e?.message || "Connexion impossible. Vérifie nom/mot de passe.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StatusBar />
      <main className="max-w-lg mx-auto p-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
          <h2 className="text-xl font-semibold mb-1">Rejoindre la partie</h2>
          <div className="text-xs text-neutral-400 mb-4">
            Phase : <span className="text-neutral-200">{phaseLabel}</span> • Inscriptions :{" "}
            <span className={joinLocked ? "text-rose-300" : "text-emerald-300"}>{joinLocked ? "fermées" : "ouvertes"}</span>
          </div>

          <div className="flex gap-2 mb-4">
            <TabBtn active={tab==="create"} onClick={()=>setTab("create")} disabled={!creationOpen} title={creationOpen ? "" : "La création est verrouillée par le MJ."}>Créer</TabBtn>
            <TabBtn active={tab==="login"}  onClick={()=>setTab("login")}>Rejoindre</TabBtn>
          </div>

          {tab==="create" && creationOpen && (
            <form onSubmit={(e)=>{e.preventDefault(); doRegister();}} className="space-y-3">
              <Input placeholder="Pseudo / Nom" value={name} onChange={e=>setName(e.target.value)} required />
              <Input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} required />
              {errorMsg && <div className="text-sm text-rose-300">{errorMsg}</div>}
              <PrimaryBtn disabled={loading || !name || !password}>{loading ? "Création..." : "Créer mon joueur"}</PrimaryBtn>
            </form>
          )}

          {tab==="login" && (
            <form onSubmit={(e)=>{e.preventDefault(); doLogin();}} className="space-y-3">
              <Input placeholder="Pseudo / Nom" value={name} onChange={e=>setName(e.target.value)} required />
              <Input type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} required />
              {errorMsg && <div className="text-sm text-rose-300">{errorMsg}</div>}
              <PrimaryBtn disabled={loading || !name || !password}>{loading ? "Connexion..." : "Rejoindre"}</PrimaryBtn>
            </form>
          )}

          <div className="mt-6">
            <button
              className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm"
              onClick={()=>{
                const saved = localStorage.getItem("player_id");
                if (saved) router.push(`/room/${saved}`);
                else alert("Aucun joueur enregistré sur cet appareil.");
              }}
            >
              Reprendre ma partie
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

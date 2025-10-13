'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { connect, on, isConnected } from "@/lib/socket";

type PhaseLabel =
  | "WAITING_START"
  | "WAITING_PLAYERS"
  | "ENVELOPES_DISTRIBUTION"
  | "ROLES_ASSIGNED"
  | "SESSION_ACTIVE"
  | "ACCUSATION_OPEN"
  | "ENDED"
  | string;

export default function JoinPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "login">("create");
  const [phaseLabel, setPhaseLabel] = useState<PhaseLabel>("WAITING_START");
  const [joinLocked, setJoinLocked] = useState<boolean>(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const creationOpen = !joinLocked;

  async function loadState(){
    try{
      const s:any = await api.getGameState();
      // lecture des deux clés : phase_label et join_locked
      const p = s?.phase_label || s?.state?.phase_label || s?.phase || "WAITING_START";
      setPhaseLabel(String(p));
      setJoinLocked(Boolean(s?.join_locked ?? s?.state?.join_locked ?? true));
      if (joinLocked && tab==="create") setTab("login");
    }catch{}
  }

  useEffect(()=>{
    let alive = true;
    loadState();

    const ws = connect(); // public
    const offEvt = on("event", (payload:any)=>{
      if(!alive) return;
      if (payload?.kind === "phase_change" && payload?.phase){
        setPhaseLabel(String(payload.phase));
      }
      if (payload?.kind === "join_locked"){
        setJoinLocked(true);
        setTab("login");
      }
      if (payload?.kind === "join_unlocked"){
        setJoinLocked(false);
        setTab("create");
      }
    });

    const id = setInterval(()=>{
      if(!isConnected()) loadState();
    }, 5000);

    return ()=>{ alive=false; offEvt(); clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doRegister() {
    setLoading(true); setErrorMsg(null);
    try {
      const res:any = await api.post("/auth/register", { name, password });
      const pid = res.player_id || res.id;
      if (!pid) throw new Error("player_id manquant dans la réponse");
      localStorage.setItem("playerId", String(pid));
      router.push(`/room/${pid}`);
    } catch (e:any) {
      setErrorMsg(e?.message || "Impossible de créer le joueur.");
    } finally { setLoading(false); }
  }

  async function doLogin() {
    setLoading(true); setErrorMsg(null);
    try {
      const res:any = await api.post("/auth/login", { name, password });
      const pid = res.player_id || res.id;
      if (!pid) throw new Error("player_id manquant dans la réponse");
      localStorage.setItem("playerId", String(pid));
      router.push(`/room/${pid}`);
    } catch (e:any) {
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
        <button
          className={`btn ${tab === "create" ? "btn-primary" : ""}`}
          onClick={() => setTab("create")}
          disabled={!creationOpen}
          title={creationOpen ? "" : "La création est verrouillée par le MJ."}
        >
          Créer
        </button>
        <button
          className={`btn ${tab === "login" ? "btn-primary" : ""}`}
          onClick={() => setTab("login")}
        >
          Rejoindre
        </button>
      </div>

      {tab === "create" && creationOpen && (
        <form onSubmit={(e)=>{e.preventDefault(); doRegister();}} className="space-y-3">
          <input className="input" placeholder="Pseudo / Nom" value={name} onChange={(e)=>setName(e.target.value)} required />
          <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          {errorMsg && <div className="text-sm text-red-400">{errorMsg}</div>}
          <button className="btn btn-primary" disabled={loading || !name || !password}>
            {loading ? "Création..." : "Créer mon joueur"}
          </button>
        </form>
      )}

      {tab === "login" && (
        <form onSubmit={(e)=>{e.preventDefault(); doLogin();}} className="space-y-3">
          <input className="input" placeholder="Pseudo / Nom" value={name} onChange={(e)=>setName(e.target.value)} required />
          <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e)=>setPassword(e.target.value)} required />
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

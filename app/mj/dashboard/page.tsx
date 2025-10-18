'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StatusBar from "@/components/StatusBar";
import MasterControls from "@/components/MasterControls";
import { api } from "@/lib/api";
import { connect } from "@/lib/socket";

export default function MasterDashboard(){
  const r = useRouter();
  const [ready, setReady] = useState(false);
  const [authErr, setAuthErr] = useState<string|null>(null);

  useEffect(() => {
    let alive = true;

    // Guard MJ : teste /party/status avec credentials: 'include'
    (async ()=>{
      try{
        await api.partyStatus(); // 200 si cookie MJ ok
        if(!alive) return;
        setReady(true);
      }catch(e:any){
        if(!alive) return;
        setAuthErr(e?.message ?? "401");
        r.replace("/mj/login");
      }
    })();

    connect();
    return ()=>{ alive = false; };
  }, [r]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="text-neutral-400 text-sm">{authErr ? "Redirection vers /mj/login..." : "Vérification de session..."}</div>
      </div>
    );
  }

  async function logout(){
    await api.mjLogout();
    r.replace("/mj/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <StatusBar />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Tableau de bord MJ</h1>
          <button onClick={logout} className="px-3 py-2 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-sm">Se déconnecter</button>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
          <MasterControls />
        </div>
      </main>
    </div>
  );
}

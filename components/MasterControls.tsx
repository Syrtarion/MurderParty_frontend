'use client';

import { useState } from "react";
import { api } from "@/lib/api";

export default function MasterControls(){
  const [loading, setLoading] = useState<string|false>(false);
  const [token, setToken] = useState<string>("");

  async function doNextStep(){
    setLoading("next");
    try { await api.masterNextStep(token); alert("Étape suivante déclenchée"); }
    catch(e:any){ alert(e.message ?? "Erreur"); }
    finally { setLoading(false); }
  }

  async function gen(kind:string){
    setLoading(kind);
    try { await api.generateIndice(kind, token); alert(`Indice ${kind} généré`); }
    catch(e:any){ alert(e.message ?? "Erreur"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-sm opacity-80">Token MJ (Bearer)</label>
        <input className="input" placeholder="colle ton token si nécessaire" value={token} onChange={e=>setToken(e.target.value)} />
      </div>

      <button className="btn" onClick={doNextStep} disabled={loading!==false}>
        {loading==="next" ? "..." : "Étape suivante"}
      </button>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn" onClick={()=>gen('crucial')} disabled={loading!==false}>
          {loading==="crucial" ? "..." : "Indice crucial"}
        </button>
        <button className="btn" onClick={()=>gen('faux_fuyant')} disabled={loading!==false}>
          {loading==="faux_fuyant" ? "..." : "Faux-fuyant"}
        </button>
        <button className="btn" onClick={()=>gen('ambigu')} disabled={loading!==false}>
          {loading==="ambigu" ? "..." : "Ambigu"}
        </button>
        <button className="btn" onClick={()=>gen('decoratif')} disabled={loading!==false}>
          {loading==="decoratif" ? "..." : "Décoratif"}
        </button>
      </div>
    </div>
  );
}

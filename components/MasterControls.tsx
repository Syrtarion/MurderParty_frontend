'use client';


import { useState } from "react";
const API = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000").replace(/\/+$/, "");
const AUTH = process.env.NEXT_PUBLIC_MJ_BEARER?.trim();


async function post(path: string, body?: any){
const res = await fetch(`${API}${path}`, {
method: "POST",
headers: {
"Content-Type": "application/json",
...(AUTH ? {"Authorization": `Bearer ${AUTH}`} : {})
},
body: body ? JSON.stringify(body) : undefined
});
if(!res.ok){
throw new Error(await res.text().catch(()=>res.statusText));
}
return res.json().catch(()=> ({}));
}


export default function MasterControls(){
const [busy, setBusy] = useState<string|null>(null);
const [msg, setMsg] = useState<string|null>(null);


async function run(tag: string, path: string, body?: any){
setBusy(tag); setMsg(null);
try{
const r = await post(path, body);
setMsg(`${tag} → OK\n` + JSON.stringify(r, null, 2));
}catch(e:any){
setMsg(`${tag} → ERREUR: ${e?.message ?? e}`);
}finally{
setBusy(null);
}
}


return (
<div className="space-y-3">
<div className="grid grid-cols-2 gap-2">
<button className="btn btn-primary" disabled={busy!==null}
onClick={()=>run("Initialiser","/party/start")}>
{busy==="Initialiser"?"…":"🚀 Initialiser"}
</button>


<button className="btn" disabled={busy!==null}
onClick={()=>run("Verrouiller","/master/lock_join")}>
{busy==="Verrouiller"?"…":"🔒 Verrouiller inscriptions"}
</button>


<button className="btn" disabled={busy!==null}
onClick={()=>run("Enveloppes cachées","/party/envelopes_hidden")}>
{busy==="Enveloppes cachées"?"…":"🫣 Enveloppes cachées"}
</button>


<button className="btn" disabled={busy!==null}
onClick={()=>run("Assigner rôles & missions","/party/roles_assign")}>
{busy==="Assigner rôles & missions"?"…":"🪪 Rôles & missions"}
</button>


<button className="btn" disabled={busy!==null}
onClick={()=>run("Démarrer session","/party/session_start")}>
{busy==="Démarrer session"?"…":"▶️ Démarrer session"}
</button>


<button className="btn" disabled={busy!==null}
onClick={()=>run("Status","/party/status")}>
{busy==="Status"?"…":"🩺 Status"}
</button>
</div>


{msg && <pre className="text-xs whitespace-pre-wrap">{msg}</pre>}
</div>
);
}
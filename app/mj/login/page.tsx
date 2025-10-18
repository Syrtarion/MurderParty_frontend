'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function MjLoginPage(){
  const r = useRouter();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function submit(e: React.FormEvent){
    e.preventDefault();
    setBusy(true); setErr(null);
    try{
      await api.mjLogin(u, p);        // pose le cookie HttpOnly
      r.push("/mj/dashboard");
    }catch(e:any){
      setErr(e?.message ?? "Login MJ refusé");
    }finally{
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-lg shadow-black/20">
        <h1 className="text-xl font-semibold mb-4">Connexion MJ</h1>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Identifiant MJ"
            value={u}
            onChange={e=>setU(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Mot de passe"
            value={p}
            onChange={e=>setP(e.target.value)}
            required
          />
          {err && <div className="text-sm text-rose-300">{err}</div>}
          <button
            className="w-full px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors disabled:opacity-60"
            disabled={busy || !u || !p}
          >
            {busy ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

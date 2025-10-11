'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const player = await api.joinPlayer(name);
      router.push(`/room/${player.id}`);
    } catch (e:any) {
      alert(e.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="card">
      <h2 className="text-lg font-medium mb-4">Rejoindre la partie</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Ton pseudo" value={name} onChange={e=>setName(e.target.value)} required />
        <button className="btn" disabled={loading || !name}>
          {loading ? "Connexion..." : "Entrer"}
        </button>
      </form>
    </main>
  );
}

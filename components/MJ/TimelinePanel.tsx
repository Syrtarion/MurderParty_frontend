'use client';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { on } from "@/lib/socket";

export default function TimelinePanel(){
  const [step, setStep] = useState<number | null>(null);

  async function load(){
    try{
      const state:any = await api.getGameState();
      setStep(typeof state?.step === "number" ? state.step : (typeof state?.phase === "number" ? state.phase : null));
    }catch{}
  }

  useEffect(()=>{
    load();
    const off = on("event", (p:any)=>{
      if (p?.kind === "round_advance" && typeof p.step === "number"){
        setStep(p.step);
      }
    });
    return ()=>{ off(); };
  }, []);

  return (
    <div>
      <h3 className="font-semibold mb-2">Timeline</h3>
      <div className="text-sm opacity-80">Étape actuelle : {step ?? "?"}</div>
    </div>
  );
}

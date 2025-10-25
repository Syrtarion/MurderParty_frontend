'use client';

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { connect, getStatus, isConnected, on, type WsStatus } from "@/lib/socket";

type StatusBarProps = {
  role?: "killer" | "innocent" | null;
  hasMission?: boolean;
};

export default function StatusBar({ role = null, hasMission = false }: StatusBarProps = {}) {
  const [phase, setPhase] = useState<string>("JOIN");
  const [locked, setLocked] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<WsStatus>(() => getStatus());

  const offline = !wsStatus.connected;
  const reconnecting = wsStatus.reconnecting;
  const attempt = wsStatus.attempt;

  async function refresh() {
    try {
      const s = await api.getGameState();
      setPhase(String(s.phase_label ?? "JOIN"));
      setLocked(Boolean(s.join_locked));
    } catch {
      /* no-op */
    }
  }

  useEffect(() => {
    let alive = true;
    refresh();

    void connect();
    const offPhase = on("event:phase_change", (ev: any) => {
      if (!alive) return;
      if (ev?.phase) setPhase(String(ev.phase));
    });
    const offLock = on("event:join_locked", () => alive && setLocked(true));
    const offUnlock = on("event:join_unlocked", () => alive && setLocked(false));
    const offStatus = on("ws:status", (status: WsStatus) => {
      if (!alive) return;
      setWsStatus(status);
    });
    const offReconnect = on("ws:reconnect", () => {
      if (!alive) return;
      refresh();
    });
    const interval = setInterval(() => {
      if (!isConnected()) {
        refresh();
      }
    }, 20_000);

    return () => {
      alive = false;
      offPhase();
      offLock();
      offUnlock();
      offStatus();
      offReconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full px-4 py-2 bg-neutral-950 border-b border-neutral-800 text-neutral-200 text-sm flex flex-wrap items-center gap-4 justify-between">
      <div className="flex items-center gap-2">
        <span className="opacity-70">Phase</span>
        <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-100">{phase}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="opacity-70">Inscriptions</span>
        <span
          className={`px-2 py-0.5 rounded ${
            locked ? "bg-rose-900/60 text-rose-200" : "bg-emerald-900/60 text-emerald-200"
          }`}
        >
          {locked ? "Fermées" : "Ouvertes"}
        </span>
        {offline && (
          <span className="text-xs text-amber-300/90">
            {reconnecting
              ? `Reconnexion... (tentative ${Math.max(attempt, 1)})`
              : "Mode secours"}
          </span>
        )}
      </div>
      {(role || hasMission) && (
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          {role && (
            <span
              className={`px-2 py-0.5 rounded font-semibold ${
                role === "killer"
                  ? "bg-rose-900/60 text-rose-200"
                  : "bg-emerald-900/60 text-emerald-200"
              }`}
            >
              Rôle : {role === "killer" ? "Killer" : "Innocent"}
            </span>
          )}
          {hasMission && (
            <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200">
              Mission reçue
            </span>
          )}
        </div>
      )}
    </div>
  );
}

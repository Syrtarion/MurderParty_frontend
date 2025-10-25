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
      // ignore refresh errors
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
    <header className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-subtle bg-raised px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted">Phase</span>
        <span className="rounded-md bg-surface px-2 py-0.5 text-xs font-semibold">{phase}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted">Inscriptions</span>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
            locked ? "bg-danger text-white" : "bg-success text-neutral-900"
          }`}
        >
          {locked ? "Fermées" : "Ouvertes"}
        </span>
        {offline && (
          <span
            className="text-xs text-muted"
            role="status"
            aria-live="polite"
          >
            {reconnecting
              ? `Reconnexion… (tentative ${Math.max(attempt, 1)})`
              : "Mode secours"}
          </span>
        )}
      </div>

      {(role || hasMission) && (
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          {role && (
            <span
              className={`rounded-md px-2 py-0.5 font-semibold ${
                role === "killer" ? "bg-danger text-white" : "bg-success text-neutral-900"
              }`}
            >
              Rôle : {role === "killer" ? "Killer" : "Innocent"}
            </span>
          )}
          {hasMission && (
            <span className="rounded-md bg-accent px-2 py-0.5 font-semibold text-xs text-white">
              Mission reçue
            </span>
          )}
        </div>
      )}
    </header>
  );
}

// lib/socket.ts
// WebSocket client minimal avec bus d'événements.
// Réémet :
//  - emit(msg.type, msg.payload)               → ex: "event"
//  - si payload.kind → emit(`event:${kind}`, payload)  → ex: "event:envelopes_update"
//
// API:
//  connect(playerId?: string)
//  on(event, handler) → unsubscribe()
//  isConnected()

type Handler = (data: any) => void;

let ws: WebSocket | null = null;
let openPromise: Promise<void> | null = null;
let connected = false;
const listeners = new Map<string, Set<Handler>>();

const RAW = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";
const WS_URL = RAW.replace(/^http/, "ws");

export function isConnected() {
  return connected;
}

export function on(event: string, handler: Handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}

function emit(event: string, data: any) {
  const set = listeners.get(event);
  if (set) {
    for (const h of Array.from(set)) {
      try { h(data); } catch { /* ignore */ }
    }
  }
}

function setupSocket() {
  if (ws) return;
  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    connected = true;
    emit("ws:open", null);
  };

  ws.onclose = () => {
    connected = false;
    emit("ws:close", null);
    ws = null;
    // retry auto
    setTimeout(() => setupSocket(), 1500);
  };

  ws.onerror = () => {
    emit("ws:error", null);
  };

  ws.onmessage = (e) => {
    let msg: any;
    try { msg = JSON.parse(e.data); } catch { return; }

    const type = msg?.type ?? "event";
    const payload = msg?.payload ?? msg;

    // 1) type brut
    emit(type, payload);

    // 2) event:KIND si applicable
    if (type === "event" && payload && typeof payload.kind === "string") {
      emit(`event:${payload.kind}`, payload);
    }
  };
}

export async function connect(playerId?: string) {
  if (!ws) setupSocket();

  if (!openPromise) {
    openPromise = new Promise<void>((resolve) => {
      if (connected) return resolve();
      const off = on("ws:open", () => { off(); resolve(); });
    });
  }
  await openPromise;

  // identification côté serveur
  if (ws && playerId) {
    const msg = JSON.stringify({ type: "identify", payload: { player_id: playerId } });
    ws.send(msg);
  }
}

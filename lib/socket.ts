// lib/socket.ts — WebSocket natif, avec isConnected, auto-reconnect (backoff), send, ping, re-identify

let ws: WebSocket | null = null;
let lastPlayerId: string | undefined;
let reconnectAttempts = 0;
let reconnectTimer: number | null = null;

type Handler = (payload: any) => void;
type EventType = "event" | "clue" | "secret_mission" | "identified" | "error" | "pong";

const listeners: Record<EventType, Set<Handler>> = {
  event: new Set(),
  clue: new Set(),
  secret_mission: new Set(),
  identified: new Set(),
  error: new Set(),
  pong: new Set(),
};

export function on(type: EventType, fn: Handler) {
  listeners[type].add(fn);
  return () => listeners[type].delete(fn);
}

function emit(type: EventType, payload: any) {
  for (const fn of listeners[type] ?? []) fn(payload);
}

function routeMessage(ev: MessageEvent) {
  try {
    const msg = JSON.parse(ev.data);
    const type = msg?.type as EventType | undefined;
    const payload = Object.prototype.hasOwnProperty.call(msg, "payload") ? msg.payload : msg;
    if (type && type in listeners) emit(type, payload);
  } catch {
    // ignorer les messages non-JSON
  }
}

function wsUrlFromEnv() {
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8000")
    .replace(/\/+$/, "");
  return base.replace(/^http/, "ws") + "/ws";
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(500 * Math.pow(2, reconnectAttempts), 5000); // 0.5s → 5s
  reconnectTimer = (setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempts += 1;
    const pid = lastPlayerId;
    try {
      connect(pid);
    } catch {
      scheduleReconnect();
    }
  }, delay) as unknown) as number;
}

export function connect(playerId?: string) {
  lastPlayerId = playerId ?? lastPlayerId;

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return ws;
  }

  const url = wsUrlFromEnv();
  ws = new WebSocket(url);

  ws.onopen = () => {
    reconnectAttempts = 0;
    if (lastPlayerId) {
      ws?.send(JSON.stringify({ type: "identify", player_id: lastPlayerId }));
    }
  };

  ws.onmessage = routeMessage;
  ws.onclose = () => scheduleReconnect();
  ws.onerror = () => { /* on laisse onclose gérer la reconnexion */ };

  return ws;
}

export function isConnected() {
  return !!ws && ws.readyState === WebSocket.OPEN;
}

export function send(type: string, payload?: any) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(JSON.stringify(payload !== undefined ? { type, payload } : { type }));
    return true;
  } catch {
    return false;
  }
}

export function ping() {
  send("ping");
}

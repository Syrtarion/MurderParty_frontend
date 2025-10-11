// lib/socket.ts
let ws: WebSocket | null = null;

type Handler = (payload: any) => void;
const listeners: Record<string, Set<Handler>> = {
  event: new Set(),
  clue: new Set(),
  secret_mission: new Set(),
  identified: new Set(),
  error: new Set(),
  pong: new Set(),
};

// S'abonner à un type (event|clue|secret_mission|identified|error|pong)
export function on(type: keyof typeof listeners, fn: Handler) {
  listeners[type].add(fn);
  return () => listeners[type].delete(fn);
}

function routeMessage(raw: MessageEvent) {
  try {
    const msg = JSON.parse(raw.data);
    const type = msg?.type as string;
    const payload = ("payload" in msg) ? msg.payload : msg; // fallback si pas de clé payload
    if (type && listeners[type]) {
      for (const fn of listeners[type].values()) fn(payload);
    }
  } catch {
    // message non JSON : ignorer
  }
}

export function connect(playerId?: string) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;

  // On part de NEXT_PUBLIC_API_BASE (REST) ou NEXT_PUBLIC_WS_URL si tu préfères
  const base = (process.env.NEXT_PUBLIC_API_BASE ?? process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8000")
                .replace(/\/+$/, "");
  const wsUrl = base.replace(/^http/, "ws") + "/ws";

  ws = new WebSocket(wsUrl);
  ws.onmessage = routeMessage;
  ws.onopen = () => {
    if (playerId) {
      // >>> Conformément à ton protocole:
      ws?.send(JSON.stringify({ type: "identify", player_id: playerId }));
    }
  };
  ws.onclose = () => { /* tu peux ajouter un auto-retry ici si tu veux */ };
  return ws;
}

export function ping() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}

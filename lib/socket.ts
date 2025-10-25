type Handler<T = any> = (data: T) => void;

export type WsStatus = {
  connected: boolean;
  reconnecting: boolean;
  attempt: number;
};

const RETRY_DELAYS = [1500, 3000, 6000, 12000, 30000];
const MAX_BUFFERED_EVENTS = 32;

const RAW_WS = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws";

function resolveWsUrl(raw: string): string {
  const normalized = raw.startsWith("http://")
    ? raw.replace("http://", "ws://")
    : raw.startsWith("https://")
    ? raw.replace("https://", "wss://")
    : raw;

  try {
    const url = new URL(normalized);
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      if (
        hostname &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1")
      ) {
        url.hostname = hostname;
      }
      if (!url.port) {
        url.port =
          new URL(normalized).port ||
          (process.env.NEXT_PUBLIC_API_BASE
            ? new URL(process.env.NEXT_PUBLIC_API_BASE).port
            : window.location.port || (window.location.protocol === "https:" ? "443" : "80"));
      }
      if (window.location.protocol === "https:" && url.protocol !== "wss:") {
        url.protocol = "wss:";
      }
      if (window.location.protocol !== "https:" && url.protocol !== "ws:") {
        url.protocol = "ws:";
      }
    }
    return url.toString();
  } catch {
    return normalized;
  }
}

const WS_URL = resolveWsUrl(RAW_WS);

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let retryIndex = 0;
let desiredPlayerId: string | null = null;
let everConnected = false;
let windowListenersBound = false;

const listeners = new Map<string, Set<Handler>>();
let backlog: Array<{ event: string; data: unknown }> = [];

let currentStatus: WsStatus = {
  connected: false,
  reconnecting: false,
  attempt: 0,
};

function ensureWindowListeners() {
  if (typeof window === "undefined" || windowListenersBound) return;
  windowListenersBound = true;
  window.addEventListener("online", () => {
    if (!ws) {
      retryIndex = 0;
      scheduleReconnect(true);
    }
  });
}

function addToBacklog(event: string, data: unknown) {
  if (backlog.length >= MAX_BUFFERED_EVENTS) backlog.shift();
  backlog.push({ event, data });
}

function flushBacklog(event: string, handler: Handler) {
  if (!backlog.length) return;
  const remaining: typeof backlog = [];
  for (const item of backlog) {
    if (item.event === event) {
      try {
        handler(item.data);
      } catch {
        /* ignore listener errors */
      }
    } else {
      remaining.push(item);
    }
  }
  backlog = remaining;
}

function emit(event: string, data: unknown) {
  const set = listeners.get(event);
  if (!set || set.size === 0) {
    if (event !== "ws:status") addToBacklog(event, data);
    return;
  }
  for (const handler of Array.from(set)) {
    try {
      handler(data);
    } catch {
      /* ignore listener errors */
    }
  }
}

function updateStatus(connected: boolean, reconnecting: boolean) {
  const attempt = reconnecting
    ? Math.min(retryIndex + 1, RETRY_DELAYS.length)
    : 0;
  currentStatus = { connected, reconnecting, attempt };
  emit("ws:status", currentStatus);
}

function identify() {
  if (!ws || !desiredPlayerId || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(
      JSON.stringify({
        type: "identify",
        payload: { player_id: desiredPlayerId },
      })
    );
  } catch {
    /* ignore send failures */
  }
}

function scheduleReconnect(immediate = false) {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (typeof window !== "undefined" && window.navigator?.onLine === false && !immediate) {
    updateStatus(false, true);
    reconnectTimer = setTimeout(() => scheduleReconnect(true), 2000);
    return;
  }

  updateStatus(false, true);

  const delay = immediate
    ? 0
    : RETRY_DELAYS[Math.min(retryIndex, RETRY_DELAYS.length - 1)];
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    setupSocket();
  }, delay);

  if (!immediate) {
    retryIndex = Math.min(retryIndex + 1, RETRY_DELAYS.length - 1);
  }
}

function setupSocket() {
  if (typeof window === "undefined" || ws) return;

  ensureWindowListeners();

  try {
    ws = new WebSocket(WS_URL);
  } catch (error) {
    ws = null;
    scheduleReconnect();
    emit("ws:error", error);
    return;
  }

  ws.onopen = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    retryIndex = 0;
    updateStatus(true, false);
    emit("ws:open", null);
    if (everConnected) {
      emit("ws:reconnect", null);
    } else {
      everConnected = true;
    }
    identify();
  };

  ws.onclose = () => {
    ws = null;
    emit("ws:close", null);
    scheduleReconnect();
  };

  ws.onerror = (event) => {
    emit("ws:error", event);
  };

  ws.onmessage = (event) => {
    let msg: any;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    const type = msg?.type ?? "event";
    const payload = msg?.payload ?? msg;

    emit(type, payload);

    if (type === "event" && payload && typeof payload.kind === "string") {
      emit(`event:${payload.kind}`, payload);
    }
  };
}

export function connect(playerId?: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (playerId) {
    desiredPlayerId = playerId;
  }

  setupSocket();

  if (currentStatus.connected) {
    identify();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const off = on("ws:open", () => {
      off();
      identify();
      resolve();
    });
  });
}

export function isConnected() {
  return currentStatus.connected;
}

export function isReconnecting() {
  return currentStatus.reconnecting;
}

export function getStatus(): WsStatus {
  return currentStatus;
}

export function on(event: string, handler: Handler) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(handler);

  if (event === "ws:status") {
    handler(currentStatus);
  } else {
    flushBacklog(event, handler);
  }

  return () => {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      listeners.delete(event);
    }
  };
}

export function off(event: string, handler: Handler) {
  const set = listeners.get(event);
  if (!set) return;
  set.delete(handler);
  if (set.size === 0) {
    listeners.delete(event);
  }
}

export function send(message: unknown) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    addToBacklog("ws:send:drop", message);
    return false;
  }
  try {
    ws.send(typeof message === "string" ? message : JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

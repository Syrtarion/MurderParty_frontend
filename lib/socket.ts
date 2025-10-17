// lib/socket.ts — WebSocket natif compatible backend MurderParty
let socket: WebSocket | null = null;
let connected = false;
const listeners = new Map<string, Set<(payload: any) => void>>();


const WS_URL = (process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:8000").replace(/^http/, "ws");


function emit(type: string, payload: any) {
const set = listeners.get(type);
if (set) for (const cb of set) try { cb(payload); } catch {}
}


export function on(type: "event" | "clue" | "message" | string, cb: (payload: any) => void) {
let set = listeners.get(type);
if (!set) { set = new Set(); listeners.set(type, set); }
set.add(cb);
return () => { set!.delete(cb); };
}


export function isConnected() { return connected; }


export function connect(playerId?: string) {
if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
return socket;
}


const url = WS_URL.replace(/\/+$/, "") + "/ws";
socket = new WebSocket(url);


socket.onopen = () => {
connected = true;
if (playerId) {
socket?.send(JSON.stringify({ type: "identify", player_id: playerId }));
}
};


socket.onclose = () => { connected = false; socket = null; setTimeout(()=>connect(playerId), 1500); };


socket.onmessage = (evt) => {
try {
const msg = JSON.parse(evt.data);
if (msg?.type === "event") emit("event", msg);
else if (msg?.type === "clue") emit("clue", msg.payload ?? msg);
else emit("message", msg);
} catch { /* ignore */ }
};


return socket;
}
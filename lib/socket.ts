import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_WS_URL as string;
    socket = io(url, { transports: ["websocket"] });
  }
  return socket;
}

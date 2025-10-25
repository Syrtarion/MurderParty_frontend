/**
 * @jest-environment jsdom
 */

import WS from "jest-websocket-mock";

let wsUrl: string;

describe("lib/socket", () => {
  beforeEach(() => {
    jest.resetModules();
    wsUrl = `ws://localhost:${Math.floor(5000 + Math.random() * 1000)}/ws`;
    process.env.NEXT_PUBLIC_WS_URL = wsUrl;
  });

  afterEach(() => {
    WS.clean();
  });

  async function loadClient() {
    return await import("@/lib/socket");
  }

  test("connect identifies player and exposes connection status", async () => {
    const server = new WS(wsUrl);
    const socket = await loadClient();

    const statusUpdates: any[] = [];
    const offStatus = socket.on("ws:status", (status) => statusUpdates.push(status));

    await socket.connect("player-42");
    await server.connected;

    await expect(server).toReceiveMessage(
      JSON.stringify({
        type: "identify",
        payload: { player_id: "player-42" },
      })
    );

    expect(socket.isConnected()).toBe(true);
    expect(statusUpdates.some((s) => s.connected && !s.reconnecting)).toBe(true);

    offStatus();
    server.close();
  });

  test(
    "reconnects with backoff and re-identifies player",
    async () => {
      const firstServer = new WS(wsUrl);
      const socket = await loadClient();

      const reconnectEvents: string[] = [];
      socket.on("ws:reconnect", () => reconnectEvents.push("reconnect"));

      await socket.connect("player-retry");
      await firstServer.connected;
      await expect(firstServer).toReceiveMessage(
        JSON.stringify({
          type: "identify",
          payload: { player_id: "player-retry" },
        })
      );

      firstServer.close();
      await firstServer.closed;

      const secondServer = new WS(wsUrl);

      await new Promise((resolve) => setTimeout(resolve, 1700));
      await secondServer.connected;

      await expect(secondServer).toReceiveMessage(
        JSON.stringify({
          type: "identify",
          payload: { player_id: "player-retry" },
        })
      );

      expect(reconnectEvents).toHaveLength(1);
      expect(socket.isConnected()).toBe(true);

      secondServer.close();
    },
    12000
  );
});

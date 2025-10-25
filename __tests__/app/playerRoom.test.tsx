/**
 * @jest-environment jsdom
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import PlayerRoom from "@/app/(public)/room/[playerId]/page";

const listeners: Record<string, Array<(payload: any) => void>> = {};

const mockConnect = jest.fn(() => Promise.resolve());
const mockIsConnected = jest.fn(() => true);
const mockGetStatus = jest.fn(() => ({
  connected: true,
  reconnecting: false,
  attempt: 0,
}));

jest.mock("@/lib/socket", () => ({
  connect: (...args: any[]) => mockConnect(...args),
  isConnected: () => mockIsConnected(),
  getStatus: () => mockGetStatus(),
  on: (event: string, handler: (payload: any) => void) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(handler);
    return () => {
      listeners[event] = (listeners[event] || []).filter((h) => h !== handler);
    };
  },
}));

const mockGetGameState = jest.fn();

jest.mock("@/lib/api", () => ({
  api: {
    getGameState: (...args: any[]) => mockGetGameState(...args),
  },
}));

const storeState = {
  events: [] as any[],
  clues: [] as any[],
};

const pushEvent = jest.fn();
const addIndice = jest.fn();

jest.mock("@/lib/store", () => ({
  useGameStore: (selector: any) =>
    selector({
      events: storeState.events,
      clues: storeState.clues,
      pushEvent,
      addIndice,
    }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
  useParams: () => ({
    playerId: "player-007",
  }),
}));

describe("Page joueur /room/[playerId]", () => {
  beforeEach(() => {
    Object.values(listeners).forEach((array) => array.splice(0, array.length));
    mockConnect.mockClear();
    mockIsConnected.mockClear();
    mockGetStatus.mockClear();
    storeState.events.length = 0;
    storeState.clues.length = 0;
    pushEvent.mockReset();
    pushEvent.mockImplementation((event) => {
      storeState.events.push(event);
    });
    addIndice.mockReset();
    addIndice.mockImplementation((indice) => {
      storeState.clues.push(indice);
    });
    mockGetGameState.mockReset();
    localStorage.clear();

    mockGetGameState.mockResolvedValue({
      phase_label: "BRIEFING",
      join_locked: true,
      players: [],
      me: {
        player_id: "player-007",
        name: "Alice",
        character_id: "char-1",
        character_name: "Inspectrice Alice",
        envelopes: [],
      },
    });
  });

  test("persiste le rôle et la mission reçus via WS et relance le chargement après reconnexion", async () => {
    render(<PlayerRoom />);

    await waitFor(() => expect(mockConnect).toHaveBeenCalledWith("player-007"));
    await waitFor(() => expect(mockGetGameState).toHaveBeenCalled());

    await act(async () => {
      listeners["role_reveal"]?.forEach((fn) =>
        fn({ role: "killer" })
      );
    });

    expect(localStorage.getItem("mp_role")).toBe("killer");
    expect(
      screen.getByRole("button", { name: /afficher/i })
    ).toBeInTheDocument();

    await act(async () => {
      listeners["secret_mission"]?.forEach((fn) =>
        fn({ title: "Objectif secret", text: "Ne pas se faire repérer." })
      );
    });

    const storedMission = localStorage.getItem("mp_mission");
    expect(storedMission).not.toBeNull();
    expect(storedMission).toContain("Objectif secret");

    const callsBefore = mockGetGameState.mock.calls.length;

    await act(async () => {
      listeners["ws:reconnect"]?.forEach((fn) => fn(null));
    });

    await waitFor(() =>
      expect(mockGetGameState.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });
});

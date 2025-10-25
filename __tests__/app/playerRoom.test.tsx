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

const pushEvent = jest.fn((event: any) => {
  storeState.events.push(event);
});
const addClue = jest.fn((clue: any) => {
  storeState.clues.push(clue);
});
const setPlayer = jest.fn();
const resetStore = jest.fn(() => {
  storeState.events = [];
  storeState.clues = [];
});

jest.mock("@/lib/store", () => ({
  useGameActions: () => ({
    pushEvent,
    addClue,
    setPlayer,
    reset: resetStore,
  }),
  useGameEvents: () => storeState.events,
  useGameClues: () => storeState.clues,
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
    storeState.events = [];
    storeState.clues = [];
    pushEvent.mockClear();
    addClue.mockClear();
    setPlayer.mockClear();
    resetStore.mockClear();
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

  test("persiste le role et la mission recus via WS et relance le chargement apres reconnexion", async () => {
    render(<PlayerRoom />);

    await waitFor(() => expect(mockConnect).toHaveBeenCalledWith("player-007"));
    await waitFor(() => expect(mockGetGameState).toHaveBeenCalled());

    await act(async () => {
      listeners["role_reveal"]?.forEach((fn) => fn({ role: "killer" }));
    });

    expect(localStorage.getItem("mp_role")).toBe("killer");
    expect(screen.getByRole("button", { name: /afficher/i })).toBeInTheDocument();

    await act(async () => {
      listeners["secret_mission"]?.forEach((fn) =>
        fn({ title: "Objectif secret", text: "Ne pas se faire reperer." })
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

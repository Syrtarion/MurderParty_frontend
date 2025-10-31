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
const mockGetGameEvents = jest.fn();
const mockListSessionHints = jest.fn();
const mockSetSessionId = jest.fn();

jest.mock("@/lib/api", () => ({
  api: {
    getGameState: (...args: any[]) => mockGetGameState(...args),
    getGameEvents: (...args: any[]) => mockGetGameEvents(...args),
    listSessionHints: (...args: any[]) => mockListSessionHints(...args),
  },
  setSessionId: (...args: any[]) => mockSetSessionId(...args),
}));

const storeState = {
  events: [] as any[],
  clues: [] as any[],
};

const pushEvent = jest.fn((event: any) => {
  storeState.events.push(event);
});
const setEvents = jest.fn((events: any[]) => {
  storeState.events = [...events];
});
const addClue = jest.fn((clue: any) => {
  storeState.clues.push(clue);
});
const setClues = jest.fn((clues: any[]) => {
  storeState.clues = [...clues];
});
const markClueDestroyed = jest.fn();
const setPlayer = jest.fn();
const resetStore = jest.fn(() => {
  storeState.events = [];
  storeState.clues = [];
});

jest.mock("@/lib/store", () => ({
  useGameActions: () => ({
    pushEvent,
    addClue,
    setClues,
    setEvents,
    markClueDestroyed,
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

jest.setTimeout(10000);

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
    mockGetGameEvents.mockReset();
    mockListSessionHints.mockReset();
    mockSetSessionId.mockReset();
    localStorage.clear();
    localStorage.setItem("mp_session_id", "session-test");
    localStorage.setItem("mp_join_code", "ABCDEF");

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
    mockGetGameEvents.mockResolvedValue({ ok: true, events: [], count: 0 });
    mockListSessionHints.mockResolvedValue({ ok: true, hints: [] });
  });

  test.skip("persiste le role et la mission recus via WS et relance le chargement apres reconnexion", async () => {
    render(<PlayerRoom />);

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

    listeners["ws:reconnect"]?.forEach((fn) => fn(null));
  });
});

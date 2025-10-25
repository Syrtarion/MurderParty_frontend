/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import StatusBar from "@/components/StatusBar";

jest.mock("@/lib/api", () => {
  return {
    api: {
      getGameState: jest.fn().mockResolvedValue({
        phase_label: "BRIEFING",
        join_locked: false,
      }),
    },
  };
});

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

describe("StatusBar", () => {
  beforeEach(() => {
    Object.values(listeners).forEach((set) => set.splice(0, set.length));
    mockConnect.mockClear();
    mockIsConnected.mockClear();
    mockGetStatus.mockClear();
  });

  test("affiche la tentative de reconnexion et relance un refresh", async () => {
    const { api } = await import("@/lib/api");

    render(<StatusBar />);

    await waitFor(() => expect(api.getGameState).toHaveBeenCalled());
    expect(mockConnect).toHaveBeenCalled();

    await act(async () => {
      listeners["ws:status"]?.forEach((fn) =>
        fn({ connected: false, reconnecting: true, attempt: 2 })
      );
    });

    expect(
      screen.getByText((content) => content.startsWith("Reconnexion"))
    ).toBeInTheDocument();

    const initialCalls = (api.getGameState as jest.Mock).mock.calls.length;

    await act(async () => {
      listeners["ws:reconnect"]?.forEach((fn) => fn(null));
    });

    await waitFor(() =>
      expect((api.getGameState as jest.Mock).mock.calls.length).toBeGreaterThan(
        initialCalls
      )
    );
  });
});

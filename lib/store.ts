import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { GameEvent, PlayerClue, PlayerState } from "@/lib/types";

interface GameSlice {
  player?: PlayerState;
  clues: PlayerClue[];
  events: GameEvent[];
}

interface GameActions {
  setPlayer: (player?: PlayerState) => void;
  addClue: (clue: PlayerClue) => void;
  setClues: (clues: PlayerClue[]) => void;
  markClueDestroyed: (
    hintId: string,
    meta?: { destroyedAt?: number; destroyedBy?: string | null }
  ) => void;
  pushEvent: (event: GameEvent) => void;
  setEvents: (events: GameEvent[]) => void;
  reset: () => void;
}

export type GameStore = GameSlice & GameActions;

const initialState: GameSlice = {
  player: undefined,
  clues: [],
  events: [],
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,
  setPlayer: (player) => set({ player }),
  addClue: (clue) =>
    set((state) => ({
      clues: (() => {
        const next = [...state.clues];
        const idx = next.findIndex((c) => c.id === clue.id);
        if (idx >= 0) {
          next[idx] = { ...next[idx], ...clue };
          return next;
        }
        next.push(clue);
        return next;
      })(),
    })),
  setClues: (clues) =>
    set(() => ({
      clues: [...clues],
    })),
  markClueDestroyed: (hintId, meta) =>
    set((state) => ({
      clues: state.clues.map((clue) =>
        clue.id === hintId
          ? {
              ...clue,
              destroyed: true,
              destroyedAt: meta?.destroyedAt ?? clue.destroyedAt ?? Date.now(),
              destroyedBy: meta?.destroyedBy ?? clue.destroyedBy ?? null,
            }
          : clue
      ),
    })),
  setEvents: (events) =>
    set(() => ({
      events: [...events],
    })),
  pushEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
    })),
  reset: () =>
    set(() => ({
      player: undefined,
      clues: [],
      events: [],
    })),
}));

export const selectPlayer = (state: GameStore) => state.player;
export const selectClues = (state: GameStore) => state.clues;
export const selectEvents = (state: GameStore) => state.events;

export const useGamePlayer = () => useGameStore(selectPlayer);
export const useGameClues = () => useGameStore(selectClues);
export const useGameEvents = () => useGameStore(selectEvents);

export const useGameActions = () =>
  useGameStore(
    useShallow(
      ({
        setPlayer,
        addClue,
        setClues,
        markClueDestroyed,
        pushEvent,
        setEvents,
        reset,
      }) => ({
        setPlayer,
        addClue,
        setClues,
        markClueDestroyed,
        pushEvent,
        setEvents,
        reset,
      })
    )
  );

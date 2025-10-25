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
  pushEvent: (event: GameEvent) => void;
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
      clues: [...state.clues, clue],
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
    useShallow(({ setPlayer, addClue, pushEvent, reset }) => ({
      setPlayer,
      addClue,
      pushEvent,
      reset,
    }))
  );

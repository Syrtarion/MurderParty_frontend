import { create } from "zustand";

export type Indice = { id:string; text:string; kind:"crucial"|"faux_fuyant"|"ambigu"|"decoratif"; };
export type EventLog = { id:string; type:string; payload:any; ts:number; };
export type Player = { id:string; name:string; clues?:string[] };

type GameState = {
  player?: Player;
  clues: Indice[];
  events: EventLog[];
  setPlayer: (p: Player) => void;
  addIndice: (i: Indice) => void;
  pushEvent: (e: EventLog) => void;
  reset: () => void;
};

export const useGameStore = create<GameState>((set) => ({
  clues: [],
  events: [],
  setPlayer: (player) => set({ player }),
  addIndice: (i) => set((s) => ({ clues: [...s.clues, i] })),
  pushEvent: (e) => set((s) => ({ events: [e, ...s.events] })),
  reset: () => set({ player: undefined, clues: [], events: [] })
}));

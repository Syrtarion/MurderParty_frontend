export type ClueKind = "crucial" | "ambigu" | "decoratif" | "faux_fuyant";

export interface PlayerClue {
  id: string;
  text: string;
  kind: ClueKind;
  tier?: string;
  roundIndex?: number;
  shared?: boolean;
  discovererId?: string | null;
  destroyed?: boolean;
  destroyedAt?: number | null;
  destroyedBy?: string | null;
}

export type Mission = {
  title?: string;
  text?: string;
};

export interface PlayerEnvelope {
  id: string;
  num: number;
}

export interface PlayerState {
  playerId: string;
  name: string;
  characterId?: string | null;
  characterName?: string | null;
  role?: string | null;
  mission?: Mission | null;
  envelopes?: PlayerEnvelope[];
}

export interface GameEvent<TType extends string = string, TPayload = unknown> {
  id: string;
  type: TType;
  payload: TPayload;
  ts: number;
}

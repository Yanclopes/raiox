export type WordStatus = "queued" | "pending" | "current" | "used" | "rejected";

export interface Word {
  id: number;
  text: string;
  authors: string[];
  status: WordStatus;
  createdAt: number;
  updatedAt: number;
}

export interface PublicWord {
  id: number;
  text: string;
}

export interface Stats {
  queued: number;
  used: number;
  players: number;
}

export interface AdminState {
  role: "admin";
  current: Word | null;
  pending: Word | null;
  queue: Word[];
  used: Word[];
  rejected: Word[];
  ranking: { name: string; points: number }[];
  stats: Stats;
  online: { admin: number; display: number; player: number };
}

export interface DisplayState {
  role: "display";
  current: PublicWord | null;
  ranking: { name: string; points: number }[];
  stats: Stats;
}

export interface PlayerState {
  role: "player";
  current: PublicWord | null;
  stats: Stats;
  maxLength: number;
  myWords: { id: number; text: string; status: "queued" | "current" | "used" | "rejected" }[];
  myPoints: number;
  myPosition: number | null;
}

export type AdminAction =
  | "draw"
  | "pick"
  | "approve"
  | "show-now"
  | "skip-pending"
  | "reject-pending"
  | "mark-used"
  | "return-current"
  | "remove"
  | "restore"
  | "reset";

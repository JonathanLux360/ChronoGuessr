/**
 * Personal leaderboard, kept in localStorage.
 *
 * The public functions are async and take and return plain data, so a server-backed
 * version can replace this file without touching any game code.
 *
 * Missing, corrupt or unreadable data starts a fresh board and never throws.
 */
import { z } from 'zod';
import { CONFIG_VERSION, LEADERBOARD_SIZE, STORAGE_KEY } from '../config';
import type { SessionResult } from '../game/stats';

const roundDetailSchema = z.object({
  year: z.number().int(),
  guess: z.number().int(),
  clues: z.number().int().min(1),
  points: z.number().int().min(0),
  multiplier: z.number().min(1).default(1),
});

const resultSchema = z.object({
  score: z.number().int().min(0),
  playedAt: z.string().min(1),
  rounds: z.number().int().min(1),
  avgYearsOff: z.number().min(0),
  exactHits: z.number().int().min(0),
  cluesUsed: z.number().int().min(0),
  /** Older saved results have no streak fields, so they read as 0. */
  streakBonus: z.number().int().min(0).default(0),
  longestStreak: z.number().int().min(0).default(0),
  roundDetails: z.array(roundDetailSchema),
  configVersion: z.number().int(),
});

const boardSchema = z.object({
  version: z.literal(1),
  /** Results for every config version. Old versions are kept, but never mixed into the current board. */
  results: z.array(resultSchema),
});

type Board = z.infer<typeof boardSchema>;

export interface SaveOutcome {
  /** Position on the board, from 1, or null if it did not make the top 10. */
  rank: number | null;
  isNewBest: boolean;
  /** The best score before this session, or null if the board was empty. */
  previousBest: number | null;
}

function emptyBoard(): Board {
  return { version: 1, results: [] };
}

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // Access can throw, for example when site data is blocked.
  }
}

/** Used only when localStorage is unavailable, so the app still works for the current visit. */
let memoryBoard: Board | null = null;

function load(): Board {
  const store = getStorage();
  if (!store) return memoryBoard ?? emptyBoard();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return emptyBoard();
    const parsed = boardSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : emptyBoard();
  } catch {
    return emptyBoard();
  }
}

function persist(board: Board): void {
  memoryBoard = board;
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // Storage full or blocked. The in-memory copy still covers this visit.
  }
}

/** Highest score first. Ties go to the earlier session. */
function sortResults(results: readonly SessionResult[]): SessionResult[] {
  return [...results].sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt));
}

function currentResults(board: Board, configVersion: number): SessionResult[] {
  return board.results.filter((r) => r.configVersion === configVersion);
}

/** Inserts a finished session and keeps the top results. */
export async function saveResult(result: SessionResult): Promise<SaveOutcome> {
  const board = load();
  const same = currentResults(board, result.configVersion);
  const others = board.results.filter((r) => r.configVersion !== result.configVersion);

  const previousBest = same.length === 0 ? null : sortResults(same)[0].score;
  const ranked = sortResults([...same, result]).slice(0, LEADERBOARD_SIZE);
  const index = ranked.indexOf(result);

  persist({ version: 1, results: [...others, ...ranked] });

  return { rank: index === -1 ? null : index + 1, isNewBest: index === 0, previousBest };
}

/** The best sessions on the current board, best first. */
export async function getTopResults(limit: number = LEADERBOARD_SIZE): Promise<SessionResult[]> {
  return sortResults(currentResults(load(), CONFIG_VERSION)).slice(0, limit);
}

/** Wipes every saved score. */
export async function resetLeaderboard(): Promise<void> {
  persist({ ...load(), results: [] });
}

import type { CLUE_CATEGORIES } from '../config';

export type Category = (typeof CLUE_CATEGORIES)[number];

export interface Clue {
  text: string;
  context?: string;
  /** Broad region. Informational only: nothing in the game uses it yet. */
  region: string;
  difficulty: 1 | 2 | 3;
  source: string;
  /** Only verified clues are ever shown to a player. */
  verified: boolean;
}

/**
 * One year in the content pool. Each category has one or more clues; the game draws
 * one at random per category. BCE years are negative integers (1 BCE = 0).
 */
export interface YearRecord {
  year: number;
  clues: Record<Category, Clue[]>;
}

/** One planned round: the answer, the four clues drawn for it, and which one is shown free. */
export interface RoundPlan {
  year: number;
  clues: Record<Category, Clue>;
  freeCategory: Category;
}

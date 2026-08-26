/** A white equation card, or a gold category card. */
export type CardKind = 'equation' | 'category';

export interface Card {
  id: string;
  kind: CardKind;
  /** Equation cards: the answer. Category cards: the number being collected. */
  value: number;
  /** Equation cards only, e.g. "16-2". Never contains spaces or "=". */
  expression?: string;
  /** Category cards only: how many equation cards complete the set. */
  quota?: number;
}

/** One of the four tableau columns. cards[0 .. downCount-1] are face down. */
export interface Column {
  cards: Card[];
  downCount: number;
}

export interface Foundation {
  /** The gold card seated here, or null while the slot is empty. */
  card: Card | null;
  value: number;
  quota: number;
  progress: number;
  /** Cards deposited, kept so undo can put them back. */
  deposited: Card[];
  /** True while the completion animation runs; blocks further interaction. */
  completing: boolean;
}

export type Source =
  | { from: 'column'; col: number; count: number }
  | { from: 'waste' };

export type Destination =
  | { to: 'column'; col: number }
  | { to: 'foundation'; slot: number };

export type Phase = 'playing' | 'won' | 'lost-moves' | 'lost-time';

export interface Boosters {
  hint: number;
  undo: number;
  magnet: number;
  calculator: number;
  joker: number;
}

export interface HintMark {
  source: Source;
  destination: Destination;
}

export interface GameState {
  level: number;
  columns: Column[];
  foundations: Foundation[];
  /** stock[0] is the next card to be turned over. */
  stock: Card[];
  /** waste[0] is the active (leftmost, fully visible) card. */
  waste: Card[];
  selected: Source | null;
  moves: number;
  movesMax: number;
  secondsLeft: number;
  coins: number;
  lives: number;
  boosters: Boosters;
  /** Serializable undo stack of prior states (without their own history). */
  history: string[];
  phase: Phase;
  /** Blocks input while a flip or completion animation is running. */
  locked: boolean;
  hint: HintMark | null;
  /** Non-null while the calculator booster is showing answers. */
  calculatorUntil: number | null;
  toast: { id: number; text: string } | null;
  seedName: string;
}

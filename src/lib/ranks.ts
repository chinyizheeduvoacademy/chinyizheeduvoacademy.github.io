// LvxPaths — learner rank ladder

export type RankTier =
  | "grey"
  | "emerald-40"
  | "emerald-60"
  | "emerald-80"
  | "emerald-100"
  | "emerald-glow"
  | "omniscient";

export interface Rank {
  name: string;
  minItems: number;
  maxItems: number;
  tier: RankTier;
  blurb: string;
}

// The ladder
export const RANKS: Rank[] = [
  {
    name: "Script Kiddie",
    minItems: 0,
    maxItems: 5,
    tier: "grey",
    blurb: "Every legend starts here.",
  },
  {
    name: "Noob",
    minItems: 6,
    maxItems: 15,
    tier: "emerald-40",
    blurb: "You're moving.",
  },
  {
    name: "Hacker",
    minItems: 16,
    maxItems: 30,
    tier: "emerald-60",
    blurb: "The reps are showing.",
  },
  {
    name: "Pro Hacker",
    minItems: 31,
    maxItems: 45,
    tier: "emerald-80",
    blurb: "You could ship on an engagement.",
  },
  {
    name: "Elite",
    minItems: 46,
    maxItems: 60,
    tier: "emerald-100",
    blurb: "Top 10% of self-taught learners.",
  },
  {
    name: "Guru",
    minItems: 61,
    maxItems: 64,
    tier: "emerald-glow",
    blurb: "One item away from the top.",
  },
  {
    name: "Omniscient",
    minItems: 65,
    maxItems: 65,
    tier: "omniscient",
    blurb: "All 65 resources complete. Legendary.",
  },
];

// Resolve the rank for a given completed-item count
export function rankForCompleted(count: number): Rank {
  const safe = Math.max(0, Math.min(65, count));
  return (
    RANKS.find((r) => safe >= r.minItems && safe <= r.maxItems) ?? RANKS[0]
  );
}

// Return the next rank above the given one, or null if at the top
export function nextRank(current: Rank): Rank | null {
  const idx = RANKS.indexOf(current);
  return idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

// Items remaining until the next rank promotion
export function itemsToNextRank(current: Rank): number {
  const next = nextRank(current);
  if (!next) return 0;
  return next.minItems - current.maxItems;
}

"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Rank, type RankTier } from "@/lib/ranks";

/**
 * Visual treatment for each rank tier. Single accent color (emerald) at
 * increasing intensity — matches the HTB "one color, multiple opacities"
 * approach. Omniscient gets a star icon + the strongest glow.
 */
const TIER_STYLES: Record<RankTier, { wrap: string; dot: string; star?: boolean }> = {
  grey: {
    wrap: "bg-secondary/40 text-muted-foreground ring-1 ring-border",
    dot: "bg-muted-foreground/60",
  },
  "emerald-40": {
    wrap: "bg-primary/[0.08] text-primary/70 ring-1 ring-primary/20",
    dot: "bg-primary/60",
  },
  "emerald-60": {
    wrap: "bg-primary/[0.12] text-primary/85 ring-1 ring-primary/30",
    dot: "bg-primary/80",
  },
  "emerald-80": {
    wrap: "bg-primary/15 text-primary ring-1 ring-primary/40",
    dot: "bg-primary",
  },
  "emerald-100": {
    wrap: "bg-primary/20 text-primary ring-1 ring-primary/50",
    dot: "bg-primary shadow-[0_0_8px_-1px_var(--fs-lime-glow-strong)]",
  },
  "emerald-glow": {
    wrap: "bg-primary/25 text-primary ring-1 ring-primary/60 shadow-[0_0_16px_-4px_var(--fs-lime-glow-strong)]",
    dot: "bg-primary shadow-[0_0_12px_-1px_var(--fs-lime-glow-strong)]",
  },
  omniscient: {
    wrap: "bg-primary/30 text-primary ring-1 ring-primary/70 shadow-[0_0_24px_-2px_var(--fs-lime-glow-strong)]",
    dot: "bg-primary shadow-[0_0_16px_-1px_var(--fs-lime-glow-strong)]",
    star: true,
  },
};

interface RankBadgeProps {
  rank: Rank;
  className?: string;
  /** Show the rank blurb as a title attribute (tooltip on hover). */
  showBlurb?: boolean;
}

export function RankBadge({ rank, className, showBlurb = true }: RankBadgeProps) {
  const style = TIER_STYLES[rank.tier];
  return (
    <span
      title={showBlurb ? `${rank.name} — ${rank.blurb}` : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        style.wrap,
        className
      )}
    >
      {style.star ? (
        <Star className="h-2.5 w-2.5 fill-current" />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      )}
      {rank.name}
    </span>
  );
}

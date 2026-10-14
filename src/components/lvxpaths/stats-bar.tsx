"use client";

import { useMemo } from "react";
import {
  Layers,
  BookOpen,
  Clock,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { useLvxPaths } from "@/store/lvxpaths";
import { formatHours, totalHoursForItems } from "@/lib/catalog";
import { completionRate } from "@/lib/progress";
import { rankForCompleted, nextRank, itemsToNextRank } from "@/lib/ranks";
import { RankBadge } from "./rank-badge";

// Overall catalog stats — total paths, total free resources, est
export function StatsBar() {
  const catalog = useLvxPaths((s) => s.catalog);
  const progress = useLvxPaths((s) => s.progress);

  const stats = useMemo(() => {
    if (!catalog) return null;
    const allIds = catalog.items.map((i) => i.id);
    const rate = completionRate(allIds, progress);
    const rank = rankForCompleted(rate.done);
    const next = nextRank(rank);
    const toNext = itemsToNextRank(rank);
    return {
      totalPaths: catalog.paths.length,
      totalItems: catalog.items.length,
      totalHours: totalHoursForItems(catalog.items),
      rate,
      rank,
      next,
      toNext,
    };
  }, [catalog, progress]);

  if (!stats) return null;

  const cards: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    accent?: boolean;
  }[] = [
    { label: "Learning paths", value: stats.totalPaths, icon: Layers },
    { label: "Free resources", value: stats.totalItems, icon: BookOpen },
    {
      label: "Est. total hours",
      value: formatHours(stats.totalHours),
      icon: Clock,
    },
    {
      label: "Mastery Rate",
      value:
        stats.rate.pct > 0 ? `${stats.rate.pct}%` : "Start →",
      icon: CheckCircle2,
      accent: stats.rate.pct > 0,
    },
  ];

  return (
    <section
      aria-label="Catalog overview"
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4"
    >
      {cards.map((card) => (
        <div key={card.label} className="fs-glass rounded-xl p-4 sm:p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {card.label}
            </span>
            <card.icon
              className={`h-4 w-4 ${
                card.accent ? "text-primary" : "text-muted-foreground/60"
              }`}
            />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight fs-mono sm:text-3xl">
            {card.value}
          </div>
          {card.label === "Mastery Rate" && (
            <div className="mt-1 text-xs text-muted-foreground fs-mono">
              {stats.rate.pct > 0
                ? `${stats.rate.done} / ${stats.rate.total} items`
                : "check your first milestone"}
            </div>
          )}
        </div>
      ))}

      {/* Rank row — shows current rank + progress to next promotion */}
      <div className="fs-glass col-span-2 flex items-center justify-between gap-3 rounded-xl p-4 sm:p-5 md:col-span-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={stats.rank} />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">
              {stats.rank.name}
            </span>
            <span className="text-muted-foreground/60"> · {stats.rank.blurb}</span>
          </div>
        </div>
        {stats.next && stats.rate.pct < 100 && (
          <div className="text-right text-xs text-muted-foreground">
            <span className="fs-mono font-semibold text-primary">
              {stats.toNext}
            </span>{" "}
            items to{" "}
            <span className="font-medium text-foreground/80">
              {stats.next.name}
            </span>
          </div>
        )}
        {stats.rate.pct >= 100 && (
          <div className="text-right text-xs font-medium text-primary">
            Max rank achieved · 🏆
          </div>
        )}
      </div>
    </section>
  );
}

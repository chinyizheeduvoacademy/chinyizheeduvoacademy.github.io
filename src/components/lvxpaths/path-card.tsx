"use client";

import { useMemo } from "react";
import { ArrowRight, Crosshair } from "lucide-react";
import { PathIcon } from "./path-icon";
import { ProgressRing } from "./progress-ring";
import { NavLink } from "./nav-link";
import { useLvxPaths, selectItems } from "@/store/lvxpaths";
import { completionRate } from "@/lib/progress";
import { formatHours, totalHoursForItems } from "@/lib/catalog";

interface PathCardProps {
  pathId: string;
}

// Single learning-path card on the home grid
export function PathCard({ pathId }: PathCardProps) {
  const path = useLvxPaths((s) =>
    s.catalog?.paths.find((p) => p.id === pathId)
  );
  const allItems = useLvxPaths(selectItems);
  const items = useMemo(
    () => allItems.filter((i) => i.path === pathId),
    [allItems, pathId]
  );
  const progress = useLvxPaths((s) => s.progress);

  if (!path) return null;

  const ids = items.map((i) => i.id);
  const rate = completionRate(ids, progress);
  const totalHours = totalHoursForItems(items);
  const started = rate.done > 0;
  const offsecCount = items.filter((i) => i.offsec).length;
  const isOffsecPath = items.length > 0 && offsecCount / items.length >= 0.5;

  return (
    <NavLink
      href={`#/path/${pathId}`}
      aria-label={`Open ${path.name} path — ${rate.done} of ${rate.total} items complete`}
      className="fs-glass group relative flex flex-col rounded-2xl p-6 transition-all duration-300 hover:fs-glow-lime hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25 transition-colors group-hover:bg-primary/15 group-hover:ring-primary/40">
          <PathIcon name={path.icon} className="h-6 w-6" />
        </span>
        <div className="flex flex-col items-end gap-1.5">
          {isOffsecPath && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70 ring-1 ring-border">
              <Crosshair className="h-2.5 w-2.5 text-primary/70" />
              OffSec
            </span>
          )}
          <ProgressRing pct={rate.pct} size={48} strokeWidth={4} />
        </div>
      </div>

      <h3 className="mt-4 text-base font-semibold tracking-tight">
        {path.name}
      </h3>
      <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
        {path.blurb}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="fs-mono">{items.length} milestones</span>
        <span aria-hidden>·</span>
        <span className="fs-mono">{formatHours(totalHours)} est</span>
        {started && (
          <>
            <span aria-hidden>·</span>
            <span className="fs-mono text-primary">
              {rate.done}/{rate.total} done
            </span>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
        <span className="text-xs font-medium text-muted-foreground">
          {started ? "Continue" : "Start path"}
        </span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-primary-foreground">
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </NavLink>
  );
}

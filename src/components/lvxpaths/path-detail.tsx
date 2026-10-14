"use client";

import { useMemo, useEffect } from "react";
import { ArrowLeft, Clock, ListChecks, CircleCheck, Hourglass } from "lucide-react";
import type { ComponentType } from "react";
import { PathIcon } from "./path-icon";
import { ProgressRing } from "./progress-ring";
import { ProgressBar } from "./progress-bar";
import { ItemRow } from "./item-row";
import { NavLink } from "./nav-link";
import { ResetProgress } from "./reset-progress";
import { useLvxPaths, selectItems } from "@/store/lvxpaths";
import { completionRate } from "@/lib/progress";
import { formatHours, totalHoursForItems } from "@/lib/catalog";
import { trackEvent } from "@/lib/track";

interface PathDetailProps {
  pathId: string;
}

// Full detail view for one learning path
export function PathDetail({ pathId }: PathDetailProps) {
  const path = useLvxPaths((s) =>
    s.catalog?.paths.find((p) => p.id === pathId)
  );
  const allItems = useLvxPaths(selectItems);
  const items = useMemo(
    () => allItems.filter((i) => i.path === pathId),
    [allItems, pathId]
  );
  const progress = useLvxPaths((s) => s.progress);

  // Best-effort telemetry — emit a path_viewed event on mount. (Must run
  // unconditionally, before any early return, to satisfy rules-of-hooks.)
  useEffect(() => {
    trackEvent("path_viewed", undefined, pathId);
  }, [pathId]);

  if (!path) {
    return (
      <div className="fs-glass rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">
          Path not found:{" "}
          <span className="fs-mono text-foreground">{pathId}</span>
        </p>
        <NavLink
          href="#/"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all paths
        </NavLink>
      </div>
    );
  }

  const ids = items.map((i) => i.id);
  const rate = completionRate(ids, progress);
  const totalHours = totalHoursForItems(items);
  const remainingHours = items
    .filter((i) => !(i.id in progress))
    .reduce((sum, i) => sum + i.hours_est, 0);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <NavLink
        href="#/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        All paths
      </NavLink>

      {/* Header card */}
      <section className="fs-glass-strong relative overflow-hidden rounded-2xl p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4 max-w-2xl">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
              <PathIcon name={path.icon} className="h-7 w-7" />
            </span>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                Learning path
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {path.name}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {path.blurb}
              </p>
            </div>
          </div>
          <ProgressRing pct={rate.pct} size={72} strokeWidth={6} />
        </div>

        {/* Stats row */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-border/40 pt-5 sm:grid-cols-4">
          <Stat
            label="Items"
            value={String(rate.total)}
            icon={ListChecks}
          />
          <Stat
            label="Est. hours"
            value={formatHours(totalHours)}
            icon={Clock}
          />
          <Stat
            label="Completed"
            value={`${rate.done}/${rate.total}`}
            icon={CircleCheck}
            accent
          />
          <Stat
            label="Remaining"
            value={remainingHours > 0 ? formatHours(remainingHours) : "all done"}
            icon={Hourglass}
          />
        </div>

        {/* Progress bar */}
        <div className="relative mt-5">
          <ProgressBar pct={rate.pct} />
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{rate.pct}% complete</span>
            <span className="fs-mono">
              {rate.done} / {rate.total} items
            </span>
          </div>
        </div>
      </section>

      {/* Items list */}
      <section aria-label={`Items in ${path.name}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Resources ({items.length})
          </h2>
          <ResetProgress />
        </div>
        <ol className="space-y-2.5">
          {items.map((item, i) => (
            <ItemRow key={item.id} item={item} index={i + 1} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon
        className={`h-4 w-4 ${accent ? "text-primary" : "text-muted-foreground/70"}`}
      />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={`fs-mono text-sm font-semibold ${accent ? "text-primary" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

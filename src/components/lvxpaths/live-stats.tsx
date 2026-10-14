"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, TrendingUp } from "lucide-react";
import { useLvxPaths } from "@/store/lvxpaths";
import { cn } from "@/lib/utils";

interface StatsResponse {
  total_learners: number;
  total_completions: number;
  total_curator_queries: number;
  top_items: { item_id: string; completions: number }[];
  top_paths: { path_id: string; completions: number }[];
  active_learners_24h: number;
  source: "clickhouse" | "sandbox";
  error?: string;
}

// Slim one-line ticker for global platform stats
export function LiveStats() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const catalog = useLvxPaths((s) => s.catalog);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/stats", { cache: "no-store" });
        const data = (await res.json()) as StatsResponse;
        if (!cancelled) setStats(data);
      } catch {
        if (!cancelled) setStats(null);
      }
    };
    void load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const pathMap = catalog
    ? new Map(catalog.paths.map((p) => [p.id, p]))
    : new Map();
  const topPath = stats?.top_paths?.[0];
  const topPathName = topPath ? pathMap.get(topPath.path_id)?.name : null;

  // Don't render until we have data — keeps the layout clean on first paint.
  if (!stats) return null;

  const hasActivity = stats.active_learners_24h > 0 || stats.total_completions > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground",
        "fs-mono"
      )}
      aria-label="Live platform stats"
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            stats.source === "clickhouse"
              ? "bg-primary animate-pulse"
              : "bg-muted-foreground/60"
          )}
        />
        <Activity className="h-3 w-3" />
        <span className="font-semibold text-foreground/90">
          {stats.active_learners_24h}
        </span>
        learners online
      </span>
      <span className="text-border">·</span>
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3 w-3" />
        <span className="font-semibold text-foreground/90">
          {stats.total_completions.toLocaleString()}
        </span>
        items completed
      </span>
      {topPathName && (
        <>
          <span className="text-border">·</span>
          <span className="inline-flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            top path:{" "}
            <span className="font-semibold text-primary">{topPathName}</span>
          </span>
        </>
      )}
      {!hasActivity && (
        <span className="ml-auto text-muted-foreground/60">
          be the first to complete an item →
        </span>
      )}
    </div>
  );
}

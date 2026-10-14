"use client";

import { useState, useMemo } from "react";
import { PathCard } from "./path-card";
import { FilterBar, type FilterId } from "./filter-bar";
import { useLvxPaths, selectPaths, selectItems } from "@/store/lvxpaths";

// Responsive grid of path cards + the filter bar above it
export function PathGrid() {
  const paths = useLvxPaths(selectPaths);
  const allItems = useLvxPaths(selectItems);
  const [filter, setFilter] = useState<FilterId>("all");

  // Compute which paths are "offsec" (>=50% items flagged offsec).
  const offsecPathIds = useMemo(() => {
    const set = new Set<string>();
    for (const p of paths) {
      const items = allItems.filter((i) => i.path === p.id);
      if (items.length > 0) {
        const offsecCount = items.filter((i) => i.offsec).length;
        if (offsecCount / items.length >= 0.5) set.add(p.id);
      }
    }
    return set;
  }, [paths, allItems]);

  const visiblePaths = useMemo(() => {
    if (filter === "all") return paths;
    if (filter === "offsec") return paths.filter((p) => offsecPathIds.has(p.id));
    return paths.filter((p) => p.id === filter);
  }, [paths, filter, offsecPathIds]);

  if (paths.length === 0) return null;

  return (
    <div id="paths" className="space-y-5">
      <FilterBar onFilterChange={setFilter} activeFilter={filter} />
      {visiblePaths.length === 0 ? (
        <div className="fs-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No paths match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {visiblePaths.map((p) => (
            <PathCard key={p.id} pathId={p.id} />
          ))}
        </div>
      )}
    </div>
  );
}

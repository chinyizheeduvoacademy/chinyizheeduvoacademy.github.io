"use client";

import { useState, useMemo } from "react";
import { useLvxPaths } from "@/store/lvxpaths";
import { cn } from "@/lib/utils";

/**
 * Horizontal scrollable filter bar. Sits above the path grid and lets the
 * learner narrow the 11 paths by category. Adopted from the live
 * lvxcloudevs.me design — pill-shaped tags with an active state.
 *
 * Filter categories are derived from the catalog itself (every path that
 * exists gets a pill, plus an "All Tracks" default).
 */

export type FilterId = "all" | "offsec" | string; // string = path id

interface FilterBarProps {
  onFilterChange?: (filter: FilterId) => void;
  activeFilter?: FilterId;
}

interface FilterPill {
  id: FilterId;
  label: string;
  /** Predicate: which path IDs does this filter include? */
  matches: (pathId: string, pathName: string, isOffsec: boolean) => boolean;
}

export function FilterBar({ onFilterChange, activeFilter: controlledFilter }: FilterBarProps) {
  const [internalFilter, setInternalFilter] = useState<FilterId>("all");
  const active = controlledFilter ?? internalFilter;
  const paths = useLvxPaths((s) => s.catalog?.paths ?? []);

  // Build the filter pills: All Tracks + OffSec Tracks + each path.
  const pills = useMemo<FilterPill[]>(() => {
    const list: FilterPill[] = [
      {
        id: "all",
        label: "All Tracks",
        matches: () => true,
      },
      {
        id: "offsec",
        label: "OffSec Tracks",
        matches: (_id, _name, isOffsec) => isOffsec,
      },
    ];
    for (const p of paths) {
      list.push({
        id: p.id,
        label: shortLabel(p.name),
        matches: (pathId) => pathId === p.id,
      });
    }
    return list;
  }, [paths]);

  const handleClick = (id: FilterId) => {
    if (id !== active) {
      setInternalFilter(id);
      onFilterChange?.(id);
    }
  };

  return (
    <div
      className="fs-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1"
      role="tablist"
      aria-label="Filter learning paths"
    >
      {pills.map((pill) => {
        const isActive = active === pill.id;
        return (
          <button
            key={pill.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(pill.id)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
              isActive
                ? "border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_-4px_var(--fs-lime-glow-strong)]"
                : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}

/** Shorten long path names for the pill (e.g., "Web Pentesting & Bug Bounty" → "Web & Bounty"). */
function shortLabel(name: string): string {
  const map: Record<string, string> = {
    "Security Foundations": "Foundations",
    "Networking (CCNA Track)": "CCNA",
    "Linux & PrivEsc": "Linux",
    "Windows & PrivEsc": "Windows",
    "Web Pentesting & Bug Bounty": "Web & Bounty",
    "Blue Team Basics": "Blue Team",
    "AI for Security": "AI & LLM",
    "Exploit Writing 101": "Exploit Dev",
    "Reverse Engineering": "Reverse Eng",
    "Red Teaming": "Red Team",
    "Cloud Security": "Cloud",
  };
  return map[name] ?? name;
}

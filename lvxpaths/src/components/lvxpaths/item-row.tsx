"use client";

import { useState } from "react";
import {
  ExternalLink,
  CheckCircle2,
  Circle,
  BookOpen,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLvxPaths } from "@/store/lvxpaths";
import { formatHours } from "@/lib/catalog";
import {
  type CatalogItem,
  type CatalogLevel,
  type CatalogType,
} from "@/lib/catalog";
import { LessonPanel } from "./lesson-panel";
import { LabLauncher } from "./lab-launcher";

// Level text styles — text-only, no badges. Lime intensity only.
const LEVEL_TEXT_STYLES: Record<CatalogLevel, string> = {
  beginner: "text-muted-foreground",
  intermediate: "text-primary/80",
  advanced: "text-primary font-medium",
};

// Kept for backwards compat (path-card uses the bg ring style).
const LEVEL_STYLES: Record<CatalogLevel, string> = {
  beginner: "bg-primary/[0.06] text-primary/70 ring-1 ring-primary/20",
  intermediate: "bg-primary/[0.10] text-primary ring-1 ring-primary/30",
  advanced: "bg-primary/15 text-primary ring-1 ring-primary/50 shadow-[0_0_12px_-4px_var(--fs-lime-glow-strong)]",
};

const TYPE_LABELS: Record<CatalogType, string> = {
  course: "Course",
  videos: "Videos",
  interactive: "Interactive",
  labs: "Labs",
  ctf: "CTF",
  reference: "Reference",
  tool: "Tool",
  articles: "Articles",
};

interface ItemRowProps {
  item: CatalogItem;
  /** 1-based display index. */
  index: number;
}

/**
 * A single resource row inside a path. Click the checkbox to toggle
 * completion in localStorage. The external link opens the official resource
 * in a new tab with `rel="noopener noreferrer"`. The "View lesson" button
 * expands an AI-generated lesson panel below the row — original teaching
 * content that complements (never reproduces) the resource.
 *
 * Per AGENTS.md hard rule #4, all dynamic text is rendered as React children
 * (auto-escaped) — never as `dangerouslySetInnerHTML`.
 */
export function ItemRow({ item, index }: ItemRowProps) {
  const done = useLvxPaths((s) => s.progress[item.id] != null);
  const toggle = useLvxPaths((s) => s.toggleItem);
  const [lessonOpen, setLessonOpen] = useState(false);

  return (
    <li className="space-y-2">
      <div
        className={cn(
          "fs-glass group relative flex items-start gap-3 rounded-xl p-4 transition-colors sm:p-5",
          done && "bg-primary/[0.04] ring-1 ring-primary/30"
        )}
      >
        {/* Number + checkbox column */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="fs-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {String(index).padStart(2, "0")}
          </span>
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={`${done ? "Mark incomplete" : "Mark complete"}: ${item.title}`}
            onClick={() => toggle(item.id)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-md border transition-all duration-200",
              done
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/60 hover:text-primary"
            )}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Content column */}
        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "text-sm font-semibold leading-snug",
              done && "text-muted-foreground line-through decoration-primary/50"
            )}
          >
            {item.title}
          </h4>

          {/* Meta line — stripped to essentials: provider · level · hours.
              OffSec/AI are subtle dots, not full badges. No tag pills
              (redundant with the title). HTB-style restraint. */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">{item.provider}</span>
            <span aria-hidden className="text-border">·</span>
            <span className={cn("capitalize", LEVEL_TEXT_STYLES[item.level])}>{item.level}</span>
            {item.hours_est > 0 && (
              <>
                <span aria-hidden className="text-border">·</span>
                <span className="fs-mono">{formatHours(item.hours_est)}</span>
              </>
            )}
            {/* OffSec + AI as subtle dots, not full badges */}
            {item.offsec && (
              <span
                title="Offensive security focused"
                className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary/60"
              >
                <span className="h-1 w-1 rounded-full bg-primary/60" />
                offsec
              </span>
            )}
            {item.ai_assisted && (
              <span
                title="Covers AI / LLM content"
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary/60"
              >
                <span className="h-1 w-1 rounded-full bg-primary/60" />
                ai
              </span>
            )}
          </div>

          {item.free_note && (
            <p className="mt-2 text-[11px] italic leading-snug text-muted-foreground/80">
              {item.free_note}
            </p>
          )}

          {/* View lesson button + Launch lab button */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLessonOpen((v) => !v)}
              aria-expanded={lessonOpen}
              aria-controls={`lesson-panel-${item.id}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                lessonOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-secondary/40 text-foreground/80 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <BookOpen className="h-3 w-3" />
              {lessonOpen ? "Hide lesson" : "View lesson"}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  lessonOpen && "rotate-180"
                )}
              />
            </button>
            {item.lab && (
              <LabLauncher itemId={item.id} lab={item.lab} />
            )}
          </div>
        </div>

        {/* External link column */}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${item.provider} resource in a new tab`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg border border-border bg-secondary/40 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* AI lesson panel — expands below the row */}
      {lessonOpen && (
        <div id={`lesson-panel-${item.id}`} role="region" aria-label={`AI lesson for ${item.title}`}>
          <LessonPanel
            itemId={item.id}
            onClose={() => setLessonOpen(false)}
          />
        </div>
      )}
    </li>
  );
}

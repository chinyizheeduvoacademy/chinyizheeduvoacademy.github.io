"use client";

import { ShieldCheck, Github, User } from "lucide-react";
import { NavLink } from "./nav-link";
import { RankBadge } from "./rank-badge";
import { useLvxPaths } from "@/store/lvxpaths";
import { rankForCompleted } from "@/lib/ranks";

/**
 * Sticky top navigation. Always visible, glass background so the page
 * gradient bleeds through underneath. Shows the user's current rank
 * (derived from local progress) next to the brand — the HTB-style
 * gamification hook that pulls learners forward.
 */
export function SiteHeader() {
  const progress = useLvxPaths((s) => s.progress);
  const completedCount = Object.keys(progress).length;
  const rank = rankForCompleted(completedCount);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <NavLink
            href="#/"
            className="group flex items-center gap-2.5"
            aria-label="LvxPaths home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/30 transition-colors group-hover:bg-primary/15 group-hover:ring-primary/50">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-sm font-bold tracking-tight">
                LvxPaths
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                free · legal · curated
              </span>
            </span>
            <span className="text-sm font-bold tracking-tight sm:hidden">
              LvxPaths
            </span>
          </NavLink>
          {completedCount > 0 && (
            <RankBadge rank={rank} className="hidden sm:inline-flex" />
          )}
        </div>
        <nav className="flex items-center gap-1">
          <NavLink
            href="#/about"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            aria-label="About the curator"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">About</span>
          </NavLink>
          <a
            href="https://github.com/chinyizheeduvoacademy/chinyizheeduvoacademy.github.io"
            target="_blank"
            rel="noopener noreferrer"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            aria-label="View source on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </nav>
      </div>
    </header>
  );
}

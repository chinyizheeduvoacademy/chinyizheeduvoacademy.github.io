"use client";

import { ShieldCheck, Play, Heart, Github, Sparkles, Terminal } from "lucide-react";
import { NavLink } from "./nav-link";
import { useLvxPaths } from "@/store/lvxpaths";
import { rankForCompleted } from "@/lib/ranks";

// Hero section — HTB-style asymmetric layout
export function Hero() {
  const progress = useLvxPaths((s) => s.progress);
  const completed = Object.keys(progress).length;
  const rank = rankForCompleted(completed);

  const scrollToPaths = () => {
    document
      .getElementById("paths")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {/* Layer 1: hex grid pattern in the bottom-right corner (HTB signature) */}
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[28rem] w-[28rem] opacity-[0.18]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 0L56 16.18V49.5L28 65.68 0 49.5V16.18z' fill='none' stroke='%239cff00' stroke-width='0.5'/%3E%3Cpath d='M28 50.32L56 66.5V99.82L28 116 0 99.82V66.5z' fill='none' stroke='%239cff00' stroke-width='0.5'/%3E%3C/svg%3E\")",
          backgroundSize: "56px 100px",
          maskImage:
            "radial-gradient(circle at bottom right, black, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at bottom right, black, transparent 70%)",
        }}
      />

      {/* Layer 2: geometric diamond overlays with thin lime edges */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-8 right-24 h-32 w-32 rotate-45 border border-primary/15 backdrop-blur-[2px]" />
        <div className="absolute top-20 right-48 h-20 w-20 rotate-45 border border-primary/10" />
        <div className="absolute bottom-24 right-12 h-24 w-24 rotate-45 border border-primary/20 bg-primary/[0.02] backdrop-blur-[1px]" />
      </div>

      {/* Layer 3: ambient lime glow */}
      <div
        className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "var(--fs-lime-glow)" }}
        aria-hidden
      />

      {/* Layer 4: asymmetric content grid */}
      <div className="relative grid gap-10 px-6 py-16 sm:px-10 sm:py-20 md:grid-cols-[1.6fr_1fr] md:items-center md:gap-8 lg:py-24">
        {/* Left: text */}
        <div className="max-w-xl">
          {/* Top badge */}
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
            <ShieldCheck className="h-3 w-3" />
            100% Free &amp; Curated Roadmaps
          </span>

          {/* Headline — bigger, tighter, "Step by Step." in lime */}
          <h1 className="mt-7 text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-5xl md:text-6xl">
            Master Modern Security.{" "}
            <span className="text-primary">Step by Step.</span>
          </h1>

          {/* Tagline */}
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            No $300 bootcamps. No hidden paywalls. Bite-sized guided roadmaps
            across AI security, red teaming, web pentesting, and Linux privesc
            — saved directly in your browser.
          </p>

          {/* CTAs — lime only on primary */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={scrollToPaths}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold tracking-tight text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110 hover:shadow-primary/50"
            >
              <Play className="h-4 w-4" />
              Start Learning
            </button>
            <NavLink
              href="#/about"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-5 py-3 text-sm font-medium text-foreground/80 transition-colors hover:border-primary/30 hover:bg-secondary/60 hover:text-foreground"
            >
              <Heart className="h-4 w-4 text-primary" />
              Why This Is Free
            </NavLink>
          </div>

          {/* Attribution */}
          <p className="mt-8 text-xs text-muted-foreground/60">
            Curated by{" "}
            <a
              href="https://github.com/leviathan-offsec"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary/80 underline-offset-4 hover:underline"
            >
              Chin Yi Zhe
            </a>{" "}
            · OffSec · KL
          </p>
        </div>

        {/* Right: terminal visual (desktop only) — shows LIVE rank */}
        <div className="hidden md:block" aria-label="Your current rank and a sample track">
          <div className="fs-glass-strong rounded-xl border border-primary/20 p-5 shadow-2xl">
            {/* Terminal header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/60" />
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                <Terminal className="h-2.5 w-2.5" />
                lvxpaths
              </span>
            </div>

            {/* Terminal body — mono, live data */}
            <pre className="fs-mono text-[11px] leading-relaxed text-foreground/80">
              <span className="text-primary">$</span> lvxpaths status{"\n"}
              <span className="text-muted-foreground/50">{"─".repeat(34)}</span>{"\n"}
              {"  rank       "}<span className="text-primary font-semibold">{rank.name}</span>{"\n"}
              {"  completed  "}<span className="text-foreground">{completed} / 65</span>{"\n"}
              {(rank.name !== "Omniscient") && (
                <>
                  {"  to_next    "}<span className="text-foreground/80">{6 - (completed % 6) || 6} → {rank.name === "Script Kiddie" ? "Noob" : "next tier"}</span>{"\n"}
                </>
              )}
              <span className="text-muted-foreground/50">{"─".repeat(34)}</span>{"\n\n"}
              <span className="text-primary">$</span> lvxpaths track exploit-writing{"\n"}
              <span className="text-muted-foreground">{"  →"} 8 milestones · 60h est</span>{"\n"}
              <span className="text-muted-foreground">{"  →"} LiveOverflow · Phrack · Corelan</span>{"\n"}
              <span className="text-primary">▌</span>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

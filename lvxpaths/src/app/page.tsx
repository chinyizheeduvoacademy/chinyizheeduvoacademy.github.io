"use client";

import { useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useLvxPaths, installProgressSync } from "@/store/lvxpaths";
import { SiteHeader } from "@/components/lvxpaths/site-header";
import { SiteFooter } from "@/components/lvxpaths/site-footer";
import { Hero } from "@/components/lvxpaths/hero";
import { StatsBar } from "@/components/lvxpaths/stats-bar";
import { PathGrid } from "@/components/lvxpaths/path-grid";
import { PathDetail } from "@/components/lvxpaths/path-detail";
import { AboutSection } from "@/components/lvxpaths/about-section";
import { CuratorSearch } from "@/components/lvxpaths/curator-search";
import { LiveStats } from "@/components/lvxpaths/live-stats";

/**
 * Parse the current URL hash into a route.
 *
 * - `#` or `#/`          -> home
 * - `#/path/<id>`        -> path detail
 * - `#/about`           -> about the curator
 *
 * Mirrors the AGENTS.md hash-routing spec (#/ and #/path/<id>) and adds
 * a `#/about` route for the curator bio.
 */
function parseHash(): { routePath: string; routeParam: string | null } {
  if (typeof window === "undefined") {
    return { routePath: "", routeParam: null };
  }
  const raw = window.location.hash.replace(/^#\/?/, "");
  if (raw === "" || raw === "/") {
    return { routePath: "", routeParam: null };
  }
  const parts = raw.split("/");
  if (parts[0] === "path" && parts[1]) {
    return { routePath: "path", routeParam: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "about") {
    return { routePath: "about", routeParam: null };
  }
  return { routePath: "", routeParam: null };
}

export default function Page() {
  const catalog = useLvxPaths((s) => s.catalog);
  const loading = useLvxPaths((s) => s.loading);
  const error = useLvxPaths((s) => s.error);
  const loadCatalog = useLvxPaths((s) => s.loadCatalog);
  const hydrateProgress = useLvxPaths((s) => s.hydrateProgress);
  const setRoute = useLvxPaths((s) => s.setRoute);
  const routePath = useLvxPaths((s) => s.routePath);
  const routeParam = useLvxPaths((s) => s.routeParam);

  // Mount: load catalog, hydrate progress from localStorage, install the
  // cross-tab storage subscription, and wire up hashchange + popstate.
  useEffect(() => {
    loadCatalog();
    hydrateProgress();
    const unsubscribe = installProgressSync();

    const applyHash = () => {
      const parsed = parseHash();
      setRoute(parsed.routePath, parsed.routeParam);
    };
    applyHash();

    window.addEventListener("hashchange", applyHash);
    window.addEventListener("popstate", applyHash);

    return () => {
      unsubscribe();
      window.removeEventListener("hashchange", applyHash);
      window.removeEventListener("popstate", applyHash);
    };
  }, [loadCatalog, hydrateProgress, setRoute]);

  // Scroll to top on every route change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [routePath, routeParam]);

  const isPathDetail = routePath === "path" && Boolean(routeParam);
  const isAbout = routePath === "about";

  return (
    <>
      <SiteHeader />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <ErrorState error={error} />
          ) : isAbout ? (
            <AboutSection />
          ) : isPathDetail ? (
            <PathDetail pathId={routeParam!} />
          ) : (
            <HomeView />
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function HomeView() {
  return (
    <div className="space-y-10 sm:space-y-14">
      <Hero />
      <CuratorSearch />
      <StatsBar />
      <LiveStats />
      <div className="space-y-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Learning roadmaps
          </h2>
          <p className="text-sm text-muted-foreground">
            Pick a track. Check milestones as you finish them. Your progress
            saves locally — no account, no tracking, no cloud.
          </p>
        </div>
        <PathGrid />
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="fs-glass animate-pulse rounded-2xl p-10">
        <div className="h-4 w-32 rounded bg-muted-foreground/20" />
        <div className="mt-4 h-10 w-80 rounded bg-muted-foreground/15" />
        <div className="mt-3 h-4 w-full rounded bg-muted-foreground/10" />
        <div className="mt-2 h-4 w-2/3 rounded bg-muted-foreground/10" />
      </div>
      <div className="fs-glass animate-pulse rounded-2xl p-5">
        <div className="h-10 w-full rounded bg-muted-foreground/15" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="fs-glass animate-pulse rounded-xl p-5">
            <div className="h-3 w-16 rounded bg-muted-foreground/20" />
            <div className="mt-2 h-8 w-20 rounded bg-muted-foreground/15" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="fs-glass h-48 animate-pulse rounded-2xl p-5"
          >
            <div className="flex justify-between">
              <div className="h-12 w-12 rounded-xl bg-muted-foreground/15" />
              <div className="h-12 w-12 rounded-full bg-muted-foreground/15" />
            </div>
            <div className="mt-4 h-5 w-3/4 rounded bg-muted-foreground/20" />
            <div className="mt-2 h-3 w-full rounded bg-muted-foreground/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="fs-glass rounded-2xl p-8 text-center">
      <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
      <h2 className="mt-4 text-lg font-semibold">
        Couldn&apos;t load the catalog
      </h2>
      <p className="mt-1 text-sm text-muted-foreground fs-mono">{error}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Loader2 className="h-4 w-4" />
        Reload
      </button>
    </div>
  );
}

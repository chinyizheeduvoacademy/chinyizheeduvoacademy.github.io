"use client";

import { create } from "zustand";
import {
  fetchCatalog,
  type Catalog,
  type CatalogItem,
  type CatalogPath,
} from "@/lib/catalog";
import {
  readProgress,
  toggleItem,
  clearAllProgress,
  subscribeProgress,
  type ProgressMap,
} from "@/lib/progress";
import { trackEvent } from "@/lib/track";

// Stable empty-array constants — returned by selectors when the catalog
// hasn't loaded yet, so `Object.is` equality holds and React doesn't loop.
const EMPTY_PATHS: CatalogPath[] = [];
const EMPTY_ITEMS: CatalogItem[] = [];

interface LvxPathsState {
  catalog: Catalog | null;
  loading: boolean;
  error: string | null;
  progress: ProgressMap;

  // Route state (hash-based, lives in store so any component can read it)
  routePath: string; // e.g. "" for home, "path" for #/path/<id>
  routeParam: string | null; // e.g. "linux"

  // Actions
  loadCatalog: () => Promise<void>;
  hydrateProgress: () => void;
  toggleItem: (itemId: string) => void;
  resetProgress: () => void;
  setRoute: (routePath: string, routeParam: string | null) => void;
}

export const useLvxPaths = create<LvxPathsState>((set, get) => ({
  catalog: null,
  loading: true,
  error: null,
  progress: {},
  routePath: "",
  routeParam: null,

  loadCatalog: async () => {
    if (!get().loading) return; // already loaded
    try {
      const catalog = await fetchCatalog();
      set({ catalog, loading: false, error: null });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load catalog",
      });
    }
  },

  hydrateProgress: () => {
    if (typeof window === "undefined") return;
    set({ progress: readProgress() });
  },

  toggleItem: (itemId) => {
    const next = toggleItem(itemId);
    set({ progress: next });
    // Best-effort telemetry — fire-and-forget. Never blocks the UI.
    const isComplete = itemId in next;
    trackEvent(
      isComplete ? "item_complete" : "item_incomplete",
      itemId
    );
  },

  resetProgress: () => {
    const next = clearAllProgress();
    set({ progress: next });
  },

  setRoute: (routePath, routeParam) => {
    set({ routePath, routeParam });
  },
}));

// Install a single subscription that keeps the store in sync with localStorage
export function installProgressSync(): () => void {
  if (typeof window === "undefined") return () => {};
  return subscribeProgress(() => {
    useLvxPaths.setState({ progress: readProgress() });
  });
}

// Convenience selectors — all return stable references so React's
// `useSyncExternalStore` doesn't enter an infinite loop. Components that
// need a filtered subset should derive it with `useMemo` (see path-card,
// path-detail) rather than a selector that calls `.filter()` inline.
export const selectPaths = (s: LvxPathsState): CatalogPath[] =>
  s.catalog?.paths ?? EMPTY_PATHS;
export const selectItems = (s: LvxPathsState): CatalogItem[] =>
  s.catalog?.items ?? EMPTY_ITEMS;

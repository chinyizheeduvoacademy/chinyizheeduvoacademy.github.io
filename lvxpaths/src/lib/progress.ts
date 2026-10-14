/**
 * LvxPaths — localStorage-backed progress tracking.
 *
 * Per AGENTS.md hard rule #3:
 *   Progress tracking in localStorage key "lvxpaths_progress" -> { itemId: isoDate }.
 *   Checkbox per item, progress bar per path, resume state on revisit.
 *
 * All helpers are SSR-safe (they no-op on the server) so they can be imported
 * from client components without breaking the Next.js render pass.
 */

const STORAGE_KEY = "lvxpaths_progress";
const SCHEMA_VERSION = 1;

export type ProgressMap = Record<string, string>; // itemId -> ISO date string

/** Read the raw progress map from localStorage. Returns {} on server or first load. */
export function readProgress(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Drop any non-string values silently — schema resilience.
    const clean: ProgressMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string") clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

/** Persist the progress map. Writes are wrapped in try/catch + JSON.stringify. */
function writeProgress(map: ProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    // Cross-tab listeners are notified automatically via the `storage` event.
    // Same-tab updates are handled by the calling store action — no extra
    // event needed (avoids a double-setState re-render).
  } catch {
    /* Quota exceeded / disabled storage — silently ignore. */
  }
}

/** Mark an item as complete (idempotent). */
export function markComplete(itemId: string): ProgressMap {
  const next = { ...readProgress(), [itemId]: new Date().toISOString() };
  writeProgress(next);
  return next;
}

/** Remove an item from the progress map (idempotent). */
export function markIncomplete(itemId: string): ProgressMap {
  const current = readProgress();
  delete current[itemId];
  writeProgress(current);
  return current;
}

/** Toggle a single item's completion state. Returns the new map. */
export function toggleItem(itemId: string): ProgressMap {
  const current = readProgress();
  if (itemId in current) return markIncomplete(itemId);
  return markComplete(itemId);
}

/** Wipe all progress (used by the "Reset progress" button). */
export function clearAllProgress(): ProgressMap {
  writeProgress({});
  return {};
}

/** Compute completion fraction for a list of item ids. */
export function completionRate(
  itemIds: string[],
  progress: ProgressMap
): { done: number; total: number; pct: number } {
  const total = itemIds.length;
  if (total === 0) return { done: 0, total: 0, pct: 0 };
  const done = itemIds.filter((id) => id in progress).length;
  const pct = Math.round((done / total) * 100);
  return { done, total, pct };
}

/** Subscribe to cross-tab progress changes (via the `storage` event). */
export function subscribeProgress(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
  };
}

export { STORAGE_KEY, SCHEMA_VERSION };

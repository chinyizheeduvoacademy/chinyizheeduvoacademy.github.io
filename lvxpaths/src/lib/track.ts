/**
 * LvxPaths — client-side telemetry helper.
 *
 * Fires events to /api/track on a best-effort basis. `keepalive: true`
 * ensures the request survives page navigations. Failures are silently
 * swallowed — telemetry must never break the user experience.
 *
 * In the sandbox, /api/track uses the in-memory store in clickhouse.ts
 * (persisted across hot reloads via globalThis). In production with CH_URL /
 * CH_USER / CH_PASSWORD set, the same endpoint writes to ClickHouse Cloud.
 */

export type TrackEventType =
  | "item_complete"
  | "item_incomplete"
  | "lesson_viewed"
  | "curator_query"
  | "path_viewed";

interface TrackEventPayload {
  event_type: TrackEventType;
  item_id?: string;
  path_id?: string;
}

/**
 * Fire one or more events. Returns immediately — the request is
 * fire-and-forget.
 */
export function trackEvent(
  eventType: TrackEventType,
  itemId?: string,
  pathId?: string
): void {
  if (typeof window === "undefined") return;
  const payload: { events: TrackEventPayload[] } = {
    events: [{ event_type: eventType, item_id: itemId, path_id: pathId }],
  };
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

/** Fire multiple events in one request. */
export function trackEvents(events: TrackEventPayload[]): void {
  if (typeof window === "undefined") return;
  if (events.length === 0) return;
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {});
}

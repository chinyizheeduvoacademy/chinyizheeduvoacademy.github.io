// LvxPaths — ClickHouse HTTP client

export interface TrackEvent {
  event_id: string;
  event_type:
    | "item_complete"
    | "item_incomplete"
    | "lesson_viewed"
    | "curator_query"
    | "path_viewed";
  item_id?: string;
  path_id?: string;
  session_id: string;
  session_country?: string;
  occurred_at?: string; // ISO 8601; defaults to now() on the server
}

export interface StatsResponse {
  total_learners: number;
  total_completions: number;
  total_curator_queries: number;
  top_items: { item_id: string; completions: number }[];
  top_paths: { path_id: string; completions: number }[];
  active_learners_24h: number;
  source: "clickhouse" | "sandbox";
}

// ------------------------------------------------------------
// Config — env-driven, with graceful fallback.
// ------------------------------------------------------------
const CH_URL = process.env.CH_URL ?? "";
const CH_USER = process.env.CH_USER ?? "";
const CH_PASSWORD = process.env.CH_PASSWORD ?? "";
const CH_DB = process.env.CH_DB ?? "lvxpaths";

export function isClickHouseConfigured(): boolean {
  return Boolean(CH_URL && CH_USER);
}

// ------------------------------------------------------------
// In-memory sandbox store (used when CH is not configured).
// ------------------------------------------------------------
interface SandboxRow {
  event_id: string;
  event_type: string;
  item_id: string;
  path_id: string;
  session_id: string;
  session_country: string;
  occurred_at: string;
}

// Module-level store — persists for the lifetime of the dev server.
// Survives hot reloads via globalThis so we don't lose data on edit.
const SANDBOX_STORE_KEY = "__lvxpaths_sandbox_store__";
function getSandboxStore(): SandboxRow[] {
  if (typeof globalThis !== "undefined") {
    const g = globalThis as unknown as { [SANDBOX_STORE_KEY]?: SandboxRow[] };
    if (!g[SANDBOX_STORE_KEY]) g[SANDBOX_STORE_KEY] = [];
    return g[SANDBOX_STORE_KEY]!;
  }
  return [];
}

// ------------------------------------------------------------
// Insert events.
// ------------------------------------------------------------
export async function insertEvents(events: TrackEvent[]): Promise<void> {
  if (events.length === 0) return;

  // Sandbox fallback — just append to in-memory store.
  if (!isClickHouseConfigured()) {
    const store = getSandboxStore();
    for (const e of events) {
      store.push({
        event_id: e.event_id,
        event_type: e.event_type,
        item_id: e.item_id ?? "",
        path_id: e.path_id ?? "",
        session_id: e.session_id,
        session_country: e.session_country ?? "",
        occurred_at: e.occurred_at ?? new Date().toISOString(),
      });
    }
    return;
  }

  // Live ClickHouse insert via JSONEachRow over HTTP.
  const rows = events
    .map((e) =>
      JSON.stringify({
        event_id: e.event_id,
        event_type: e.event_type,
        item_id: e.item_id ?? "",
        path_id: e.path_id ?? "",
        session_id: e.session_id,
        session_country: e.session_country ?? "",
        occurred_at: (e.occurred_at ?? new Date().toISOString()).replace("T", " ").replace("Z", ""),
      })
    )
    .join("\n");

  const url = new URL(CH_URL);
  url.searchParams.set("database", CH_DB);
  url.searchParams.set(
    "query",
    "INSERT INTO events (event_id, event_type, item_id, path_id, session_id, session_country, occurred_at) FORMAT JSONEachRow"
  );

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${CH_USER}:${CH_PASSWORD}`).toString("base64"),
      "Content-Type": "application/x-ndjson",
    },
    body: rows,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`ClickHouse insert failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
}

// ------------------------------------------------------------
// Read aggregated stats.
// ------------------------------------------------------------
export async function readStats(): Promise<StatsResponse> {
  if (!isClickHouseConfigured()) {
    return readStatsFromSandbox();
  }

  // Run 3 queries in parallel — each one is fast (<10ms on ClickHouse Cloud).
  const [learners, completions, curatorQueries, topItems, topPaths, active24h] =
    await Promise.all([
      runQuery<{ c: string }>(
        "SELECT uniqExact(session_id) AS c FROM events"
      ),
      runQuery<{ c: string }>(
        "SELECT countIf(event_type = 'item_complete') AS c FROM events"
      ),
      runQuery<{ c: string }>(
        "SELECT countIf(event_type = 'curator_query') AS c FROM events"
      ),
      runQuery<{ item_id: string; c: string }>(
        `SELECT item_id, count() AS c FROM events WHERE event_type = 'item_complete' AND item_id != '' GROUP BY item_id ORDER BY c DESC LIMIT 5`
      ),
      runQuery<{ path_id: string; c: string }>(
        `SELECT path_id, count() AS c FROM events WHERE event_type = 'item_complete' AND path_id != '' GROUP BY path_id ORDER BY c DESC LIMIT 5`
      ),
      runQuery<{ c: string }>(
        `SELECT uniqExact(session_id) AS c FROM events WHERE occurred_at >= now() - INTERVAL 1 DAY`
      ),
    ]);

  return {
    total_learners: Number(learners[0]?.c ?? 0),
    total_completions: Number(completions[0]?.c ?? 0),
    total_curator_queries: Number(curatorQueries[0]?.c ?? 0),
    top_items: topItems.map((r) => ({
      item_id: r.item_id,
      completions: Number(r.c),
    })),
    top_paths: topPaths.map((r) => ({
      path_id: r.path_id,
      completions: Number(r.c),
    })),
    active_learners_24h: Number(active24h[0]?.c ?? 0),
    source: "clickhouse",
  };
}

// ------------------------------------------------------------
// Sandbox stats — aggregates the in-memory store.
// ------------------------------------------------------------
function readStatsFromSandbox(): StatsResponse {
  const rows = getSandboxStore();
  const sessions = new Set<string>();
  let completions = 0;
  let curatorQueries = 0;
  const itemCounts = new Map<string, number>();
  const pathCounts = new Map<string, number>();
  const now = Date.now();
  let active24h = 0;
  const activeSessions24h = new Set<string>();

  for (const r of rows) {
    sessions.add(r.session_id);
    if (r.event_type === "item_complete") {
      completions++;
      if (r.item_id) itemCounts.set(r.item_id, (itemCounts.get(r.item_id) ?? 0) + 1);
      if (r.path_id) pathCounts.set(r.path_id, (pathCounts.get(r.path_id) ?? 0) + 1);
    }
    if (r.event_type === "curator_query") curatorQueries++;
    const occurredMs = Date.parse(r.occurred_at);
    if (now - occurredMs < 24 * 60 * 60 * 1000) {
      activeSessions24h.add(r.session_id);
    }
  }
  active24h = activeSessions24h.size;

  return {
    total_learners: sessions.size,
    total_completions: completions,
    total_curator_queries: curatorQueries,
    top_items: [...itemCounts.entries()]
      .map(([item_id, completions]) => ({ item_id, completions }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5),
    top_paths: [...pathCounts.entries()]
      .map(([path_id, completions]) => ({ path_id, completions }))
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5),
    active_learners_24h: active24h,
    source: "sandbox",
  };
}

// ------------------------------------------------------------
// Low-level query helper.
// ------------------------------------------------------------
async function runQuery<T>(sql: string): Promise<T[]> {
  const url = new URL(CH_URL);
  url.searchParams.set("database", CH_DB);
  url.searchParams.set("query", sql + " FORMAT JSON");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: "Basic " + Buffer.from(`${CH_USER}:${CH_PASSWORD}`).toString("base64"),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "<no body>");
    throw new Error(`ClickHouse query failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: T[]; rows?: number };
  return json.data ?? [];
}

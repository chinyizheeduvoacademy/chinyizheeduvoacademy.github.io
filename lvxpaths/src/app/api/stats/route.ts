import { NextRequest, NextResponse } from "next/server";
import { readStats, isClickHouseConfigured } from "@/lib/clickhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stats
 * Returns aggregated global learning stats. In production this reads from
 * ClickHouse Cloud (the same instance as lvxcloud.services, separate
 * `lvxpaths` database). In the sandbox it reads from an in-memory store.
 *
 * Response shape:
 *   { total_learners, total_completions, total_curator_queries,
 *     top_items: [{item_id, completions}], top_paths: [{path_id, completions}],
 *     active_learners_24h, source: "clickhouse" | "sandbox" }
 */
export async function GET(_req: NextRequest) {
  try {
    const stats = await readStats();
    // Cache for 60 seconds at the edge — these numbers don't need to be
    // real-time, and it lets ClickHouse skip the query cost on hot reload.
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stats read failed.";
    return NextResponse.json(
      {
        total_learners: 0,
        total_completions: 0,
        total_curator_queries: 0,
        top_items: [],
        top_paths: [],
        active_learners_24h: 0,
        source: isClickHouseConfigured() ? "clickhouse" : "sandbox",
        error: message,
      },
      { status: 200 } // 200 even on error — the UI shows zeros gracefully
    );
  }
}

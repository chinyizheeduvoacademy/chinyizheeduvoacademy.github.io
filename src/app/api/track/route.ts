import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { insertEvents, type TrackEvent } from "@/lib/clickhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_EVENT_TYPES = new Set<TrackEvent["event_type"]>([
  "item_complete",
  "item_incomplete",
  "lesson_viewed",
  "curator_query",
  "path_viewed",
]);

// POST /api/track
export async function POST(req: NextRequest) {
  let body: { events?: unknown; event_type?: unknown; item_id?: unknown; path_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // Normalize input — accept either an array or a single event.
  let rawEvents: unknown[];
  if (Array.isArray(body.events)) {
    rawEvents = body.events;
  } else {
    rawEvents = [body];
  }

  // Resolve session_id — either from client, or derived from request
  // headers (one-way hash of IP + UA). This is what makes stats per-learner
  // without storing any PII.
  const sessionId = resolveSessionId(req);

  // Country — Cloudflare exposes CF-IPCountry on edge requests. In the
  // sandbox this header is absent so country is empty.
  const sessionCountry = req.headers.get("CF-IPCountry") ?? "";

  // Validate + normalize events.
  const events: TrackEvent[] = [];
  for (const raw of rawEvents) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as { event_type?: unknown; item_id?: unknown; path_id?: unknown };
    if (typeof e.event_type !== "string") continue;
    const et = e.event_type as TrackEvent["event_type"];
    if (!VALID_EVENT_TYPES.has(et)) continue;
    events.push({
      event_id: randomUUID(),
      event_type: et,
      item_id: typeof e.item_id === "string" ? e.item_id.slice(0, 64) : "",
      path_id: typeof e.path_id === "string" ? e.path_id.slice(0, 64) : "",
      session_id: sessionId,
      session_country: sessionCountry,
      occurred_at: new Date().toISOString(),
    });
    if (events.length >= 50) break; // hard cap per request
  }

  if (events.length === 0) {
    return NextResponse.json(
      { error: "No valid events in body." },
      { status: 400 }
    );
  }

  // Insert (best-effort — failures don't propagate to the client).
  try {
    await insertEvents(events);
  } catch (err) {
    // Log but don't fail — telemetry must never break the user experience.
    console.error("[lvxpaths:track] insert failed:", err);
  }

  return new NextResponse(null, { status: 204 });
}

// Resolve a stable, anonymous session ID for the requester
function resolveSessionId(req: NextRequest): string {
  const clientSent = req.headers.get("X-Freesec-Session");
  if (clientSent && /^[a-f0-9-]{8,64}$/i.test(clientSent)) {
    return clientSent.slice(0, 64);
  }
  // Derive from request — never store the raw IP / UA.
  const ip = req.headers.get("CF-Connecting-IP") ?? req.headers.get("X-Forwarded-For") ?? "anon";
  const ua = req.headers.get("User-Agent") ?? "anon";
  // Synchronous hash would need node:crypto's createHash; use a tiny
  // string-hash fallback. Good enough for sandbox; production uses the
  // worker's crypto.subtle.
  let h = 5381;
  const combined = `${ip}::${ua}`;
  for (let i = 0; i < combined.length; i++) {
    h = ((h << 5) + h + combined.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/track",
    body: {
      events: [
        {
          event_type: "item_complete | item_incomplete | lesson_viewed | curator_query | path_viewed",
          item_id: "string (optional)",
          path_id: "string (optional)",
        },
      ],
    },
    notes:
      "Session id is resolved server-side from CF-Connecting-IP + User-Agent hash (one-way, no PII stored). Returns 204 on success even if ClickHouse is unreachable (telemetry is best-effort).",
  });
}

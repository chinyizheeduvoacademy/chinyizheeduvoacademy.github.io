import { NextRequest, NextResponse } from "next/server";
import { findRunningLab, isFlyConfigured } from "@/lib/labs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/lab/status?item_id=<id>
 *
 * Returns the current lab session for the requester's session + item_id,
 * or 404 if no running lab. Used by the LabLauncher component to poll
 * status + detect expiry.
 */
export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("item_id")?.trim() ?? "";
  if (!itemId || itemId.length > 64) {
    return NextResponse.json(
      { error: "item_id query param is required (max 64 chars)." },
      { status: 400 }
    );
  }

  const sessionId = resolveSessionId(req);
  const session = await findRunningLab(sessionId, itemId);

  if (!session) {
    return NextResponse.json(
      { status: "stopped", item_id: itemId },
      { status: 404 }
    );
  }

  return NextResponse.json({
    session_id: session.session_id,
    item_id: session.item_id,
    lab_url: session.lab_url,
    started_at: session.started_at,
    expires_at: session.expires_at,
    stopped_at: session.stopped_at,
    status: session.status,
    source: isFlyConfigured() ? "fly.io" : "sandbox",
  });
}

function resolveSessionId(req: NextRequest): string {
  const clientSent = req.headers.get("X-LvxPaths-Session");
  if (clientSent && /^[a-f0-9-]{8,64}$/i.test(clientSent)) {
    return clientSent.slice(0, 64);
  }
  const ip = req.headers.get("CF-Connecting-IP") ?? req.headers.get("X-Forwarded-For") ?? "anon";
  const ua = req.headers.get("User-Agent") ?? "anon";
  let h = 5381;
  const combined = `${ip}::${ua}`;
  for (let i = 0; i < combined.length; i++) {
    h = ((h << 5) + h + combined.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

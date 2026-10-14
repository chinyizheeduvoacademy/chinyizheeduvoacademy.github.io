import { NextRequest, NextResponse } from "next/server";
import { stopLab, isFlyConfigured } from "@/lib/labs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/lab/stop
export async function POST(req: NextRequest) {
  let body: { item_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const itemId = typeof body.item_id === "string" ? body.item_id.trim() : "";
  if (!itemId || itemId.length > 64) {
    return NextResponse.json(
      { error: "item_id is required (max 64 chars)." },
      { status: 400 }
    );
  }

  const sessionId = resolveSessionId(req);
  const session = await stopLab(sessionId, itemId);

  if (!session) {
    return NextResponse.json(
      { status: "stopped", item_id: itemId, message: "No running lab to stop." },
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

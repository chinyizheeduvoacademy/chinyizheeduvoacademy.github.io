import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Catalog } from "@/lib/catalog";
import { launchLab, isFlyConfigured } from "@/lib/labs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOG_PATH = path.join(process.cwd(), "public", "data", "catalog.json");

/**
 * POST /api/lab/launch
 * Body: { item_id: string }
 *
 * Spins up a self-hosted lab container for the given catalog item (if the
 * item has a `lab` config). Returns the lab URL + expiry. Idempotent —
 * if the session already has a running lab for this item, returns the
 * existing session.
 *
 * Production: calls fly.io Machines API.
 * Sandbox: simulates the launch in-memory, lab_url points to the item's
 * official `url` so "Open lab" still opens something real.
 */
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

  // Load catalog, find the item, verify it has a lab config.
  let catalog: Catalog;
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    catalog = JSON.parse(raw) as Catalog;
  } catch {
    return NextResponse.json({ error: "Catalog unavailable." }, { status: 503 });
  }
  const item = catalog.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: `Item not found: ${itemId}` }, { status: 404 });
  }
  if (!item.lab) {
    return NextResponse.json(
      { error: "This item has no self-hosted lab. Open the official resource instead." },
      { status: 400 }
    );
  }

  // Resolve the anonymous session id (same pattern as /api/track).
  const sessionId = resolveSessionId(req);

  try {
    const session = await launchLab(sessionId, {
      itemId,
      image: item.lab.image,
      port: item.lab.port ?? 3000,
      timeoutMinutes: item.lab.timeout_minutes ?? 120,
      fallbackUrl: item.url, // sandbox mode uses the official URL
    });

    return NextResponse.json({
      session_id: session.session_id,
      item_id: session.item_id,
      lab_url: session.lab_url,
      started_at: session.started_at,
      expires_at: session.expires_at,
      status: session.status,
      source: isFlyConfigured() ? "fly.io" : "sandbox",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lab launch failed.";
    return NextResponse.json(
      { error: "Couldn't launch the lab. Please try again.", detail: message },
      { status: 502 }
    );
  }
}

/** Resolve anonymous session id (one-way hash, no PII). Mirrors /api/track. */
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

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/lab/launch",
    body: { item_id: "string (catalog item id with a `lab` config)" },
    response: {
      session_id: "string",
      item_id: "string",
      lab_url: "string (https:// or ssh://)",
      started_at: "ISO 8601",
      expires_at: "ISO 8601",
      status: "starting | running | failed",
      source: "fly.io | sandbox",
    },
    notes:
      "Idempotent — re-launching the same item for the same session returns the existing running lab. Production uses fly.io Machines API; sandbox simulates with lab_url pointing to the official resource URL.",
  });
}

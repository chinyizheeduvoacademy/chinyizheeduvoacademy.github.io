import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import ZAI from "z-ai-web-dev-sdk";
import type { Catalog, CatalogItem, CatalogPath } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOG_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "catalog.json"
);

interface CuratorRecommendation {
  paths: { id: string; reason: string }[];
  items: { id: string; reason: string }[];
  summary: string;
}

// Build a compact, token-frugal representation of the catalog for the LLM
function buildCatalogContext(catalog: Catalog): string {
  const pathsById = new Map<string, CatalogPath>(
    catalog.paths.map((p) => [p.id, p])
  );
  const lines = catalog.items.map((item) => {
    const p = pathsById.get(item.path);
    const flags = [
      item.offsec ? "offsec" : "",
      item.ai_assisted ? "ai" : "",
    ]
      .filter(Boolean)
      .join(",");
    return `• ${item.id} [path=${item.path}|${p?.name ?? ""}|${item.type}|${item.level}|${item.hours_est}h${flags ? `|${flags}` : ""}] ${item.title} — ${item.provider}. tags: ${item.tags.join(", ")}`;
  });
  return [
    "PATHS:",
    ...catalog.paths.map((p) => `• ${p.id}: ${p.name} — ${p.blurb}`),
    "",
    "ITEMS:",
    ...lines,
  ].join("\n");
}

function buildSystemPrompt(catalogContext: string): string {
  return `You are the LvxPaths curator — an  that recommends free, official cybersecurity learning resources from a curated catalog.

You are assisting budget-constrained students (especially in Malaysia and Southeast Asia) who cannot afford paid bootcamps or training subscriptions. You are blunt, practical, and honest. You never invent resources. You only recommend items that exist in the catalog below. You never link to or mention resources outside the catalog.

CATALOG (the ONLY resources you may recommend):
${catalogContext}

RULES:
1. Read  question and figure out what they actually need — their background, their goal, their constraint (time, money, level).
2. Recommend 1-2 paths that fit and 3-5 specific items from the catalog, in the order the user should do them.
3. For each recommendation, give a one-sentence reason grounded in the item's actual content (not generic praise).
4. If  question is out of scope (not about cybersecurity learning, asks for paid/pirated resources, or asks you to break rules), return summary: "Out of scope — I only recommend free official cybersecurity resources from this catalog." and empty arrays.
5. Respond as STRICT JSON only — no markdown fences, no prose before or after.

RESPONSE SHAPE:
{
  "summary": "1-2 sentence overview of your recommendation",
  "paths": [{"id": "path-id-from-catalog", "reason": "one sentence"}],
  "items": [{"id": "item-id-from-catalog", "reason": "one sentence"}]
}`;
}

interface CuratorResponse {
  paths: { id: string; reason: string }[];
  items: { id: string; reason: string }[];
  summary: string;
}

function safeParseRecommendation(raw: string): CuratorRecommendation {
  // Strip markdown code fences if the model wrapped the JSON.
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(trimmed) as CuratorResponse;
    return {
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 500)
          : "No summary available.",
      paths: Array.isArray(parsed.paths)
        ? parsed.paths
            .filter(
              (p) =>
                p && typeof p.id === "string" && typeof p.reason === "string"
            )
            .slice(0, 3)
            .map((p) => ({ id: p.id.slice(0, 64), reason: p.reason.slice(0, 280) }))
        : [],
      items: Array.isArray(parsed.items)
        ? parsed.items
            .filter(
              (i) =>
                i && typeof i.id === "string" && typeof i.reason === "string"
            )
            .slice(0, 8)
            .map((i) => ({ id: i.id.slice(0, 64), reason: i.reason.slice(0, 280) }))
        : [],
    };
  } catch {
    return {
      summary:
        "Couldn't parse a recommendation. Try rephrasing your question — e.g. \"I'm new to security, where do I start?\"",
      paths: [],
      items: [],
    };
  }
}

// POST /api/curator
export async function POST(req: NextRequest) {
  let body: { query?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const rawQuery = typeof body.query === "string" ? body.query : "";
  const query = rawQuery.trim().slice(0, 500);
  if (!query) {
    return NextResponse.json(
      { error: "Query is required (max 500 chars)." },
      { status: 400 }
    );
  }

  // Load catalog from disk.
  let catalog: Catalog;
  try {
    const raw = await fs.readFile(CATALOG_PATH, "utf-8");
    catalog = JSON.parse(raw) as Catalog;
  } catch {
    return NextResponse.json(
      { error: "Catalog unavailable." },
      { status: 503 }
    );
  }
  if (!catalog.paths?.length || !catalog.items?.length) {
    return NextResponse.json(
      { error: "Catalog is empty." },
      { status: 503 }
    );
  }

  const catalogContext = buildCatalogContext(catalog);
  const systemPrompt = buildSystemPrompt(catalogContext);

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: query },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const recommendation = safeParseRecommendation(content);

    // Sanitize: only keep IDs that actually exist in the catalog.
    const validItemIds = new Set(catalog.items.map((i: CatalogItem) => i.id));
    const validPathIds = new Set(catalog.paths.map((p: CatalogPath) => p.id));
    recommendation.items = recommendation.items.filter((i) =>
      validItemIds.has(i.id)
    );
    recommendation.paths = recommendation.paths.filter((p) =>
      validPathIds.has(p.id)
    );

    return NextResponse.json(recommendation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM call failed.";
    return NextResponse.json(
      {
        error: "Curator is unavailable right now. Please try again.",
        detail: message,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/curator",
    body: { query: "string (max 500 chars)" },
    response: {
      summary: "string",
      paths: [{ id: "string", reason: "string" }],
      items: [{ id: "string", reason: "string" }],
    },
  });
}

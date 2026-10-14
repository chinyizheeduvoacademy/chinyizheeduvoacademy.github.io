import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import ZAI from "z-ai-web-dev-sdk";
import type { Catalog, CatalogItem } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATALOG_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "catalog.json"
);

interface Lesson {
  learningObjectives: string[];
  focusAreas: { topic: string; why: string }[];
  commonPitfalls: { mistake: string; fix: string }[];
  selfCheck: string[];
  prerequisites: string;
  nextStep: string;
  estimatedTime: string;
}

interface LessonResponse {
  lesson: Lesson;
  generatedAt: string;
}

function buildSystemPrompt(): string {
  return `You are the LvxPaths teaching assistant. Given a free, official cybersecurity learning resource, you generate a structured lesson plan that COMPLEMENTS (not reproduces) the resource. The learner is a budget-constrained student who cannot afford paid training — be concrete, practical, and honest.

You NEVER reproduce the resource's content. You describe what the learner should focus on, common pitfalls, and how to verify they've actually learned it. You write original teaching content, not summaries of someone else's course.

For the given resource, generate:
1. learningObjectives: 3-5 specific, measurable outcomes the learner should achieve after completing this resource. Each MUST start with an action verb (Identify, Exploit, Configure, Analyze, Bypass, Detect, etc.). No generic "understand" or "learn about" — name the concrete skill.
2. focusAreas: 3-5 specific topics within the resource that deserve extra attention. For each, give a one-sentence "why" grounded in real-world value (e.g., "this is the most common privesc vector on Linux engagement boxes").
3. commonPitfalls: 2-3 mistakes learners commonly make with this topic, with a one-sentence fix for each. Be specific to the topic, not generic ("practice more" is useless).
4. selfCheck: 3 questions the learner should be able to answer after completing the resource. Phrase them so the answer requires actual understanding, not rote recall. Each question should start with "How would you..." or "What's the difference between..." or "When would you choose...".
5. prerequisites: one sentence describing what the learner should already know before starting this resource. Be specific (e.g., "comfortable navigating a Linux terminal and reading bash scripts").
6. nextStep: one sentence suggesting what to learn next, after this resource. Name a concrete follow-up topic or skill, not a generic "explore more".
7. estimatedTime: a short string like "4-6 hours with practice" or "2 weeks part-time" that adjusts the resource's nominal hours_est based on the assumption that the learner is ACTIVELY practicing, not just watching videos.

Respond as STRICT JSON only — no markdown fences, no prose before or after.

RESPONSE SHAPE:
{
  "learningObjectives": ["...", "..."],
  "focusAreas": [{"topic": "...", "why": "..."}],
  "commonPitfalls": [{"mistake": "...", "fix": "..."}],
  "selfCheck": ["...", "..."],
  "prerequisites": "...",
  "nextStep": "...",
  "estimatedTime": "..."
}`;
}

function buildUserPrompt(item: CatalogItem): string {
  const flags = [
    item.offsec ? "offensive-security focused" : "",
    item.ai_assisted ? "covers AI/LLM content" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return `Generate a lesson plan for this free cybersecurity learning resource:

Title: ${item.title}
Provider: ${item.provider}
URL: ${item.url}
Type: ${item.type}
Level: ${item.level}
Estimated hours (nominal): ${item.hours_est}
Tags: ${item.tags.join(", ")}
${flags ? `Focus flags: ${flags}` : ""}

Generate the structured lesson plan as JSON per the system instructions.`;
}

function safeParseLesson(raw: string): Lesson | null {
  // Strip markdown fences if present.
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(trimmed) as Partial<Lesson>;
    return {
      learningObjectives: Array.isArray(parsed.learningObjectives)
        ? parsed.learningObjectives
            .filter((x) => typeof x === "string")
            .slice(0, 6)
            .map((x) => (x as string).slice(0, 220))
        : [],
      focusAreas: Array.isArray(parsed.focusAreas)
        ? parsed.focusAreas
            .filter(
              (x) =>
                x &&
                typeof (x as { topic?: unknown }).topic === "string" &&
                typeof (x as { why?: unknown }).why === "string"
            )
            .slice(0, 6)
            .map((x) => ({
              topic: (x as { topic: string }).topic.slice(0, 160),
              why: (x as { why: string }).why.slice(0, 280),
            }))
        : [],
      commonPitfalls: Array.isArray(parsed.commonPitfalls)
        ? parsed.commonPitfalls
            .filter(
              (x) =>
                x &&
                typeof (x as { mistake?: unknown }).mistake === "string" &&
                typeof (x as { fix?: unknown }).fix === "string"
            )
            .slice(0, 5)
            .map((x) => ({
              mistake: (x as { mistake: string }).mistake.slice(0, 220),
              fix: (x as { fix: string }).fix.slice(0, 280),
            }))
        : [],
      selfCheck: Array.isArray(parsed.selfCheck)
        ? parsed.selfCheck
            .filter((x) => typeof x === "string")
            .slice(0, 5)
            .map((x) => (x as string).slice(0, 280))
        : [],
      prerequisites:
        typeof parsed.prerequisites === "string"
          ? parsed.prerequisites.slice(0, 400)
          : "",
      nextStep:
        typeof parsed.nextStep === "string"
          ? parsed.nextStep.slice(0, 400)
          : "",
      estimatedTime:
        typeof parsed.estimatedTime === "string"
          ? parsed.estimatedTime.slice(0, 80)
          : "",
    };
  } catch {
    return null;
  }
}

/**
 * POST /api/lesson
 * Body: { "itemId": string }
 * Returns: { "lesson": {...}, "generatedAt": ISO }
 *
 * Generates (or returns) an AI lesson plan for a catalog item. The lesson
 * is original AI-generated content that COMPLEMENTS the free resource — it
 * never reproduces the resource's content. Per-item caching happens on the
 * client (localStorage key `lvxpaths_lesson_<itemId>`); the server does not
 * cache to keep statelessness simple.
 */
export async function POST(req: NextRequest) {
  let body: { itemId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  if (!itemId || itemId.length > 64) {
    return NextResponse.json(
      { error: "itemId is required (max 64 chars)." },
      { status: 400 }
    );
  }

  // Load catalog, find item.
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
  const item = catalog.items.find((i) => i.id === itemId);
  if (!item) {
    return NextResponse.json(
      { error: `Item not found: ${itemId}` },
      { status: 404 }
    );
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(item);

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    const lesson = safeParseLesson(content);

    if (!lesson) {
      return NextResponse.json(
        {
          error:
            "Couldn't generate a lesson for this item. Please try again in a moment.",
        },
        { status: 502 }
      );
    }

    const response: LessonResponse = {
      lesson,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LLM call failed.";
    return NextResponse.json(
      {
        error: "Lesson generator is unavailable right now. Please try again.",
        detail: message,
      },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/lesson",
    body: { itemId: "string (catalog item id, max 64 chars)" },
    response: {
      lesson: {
        learningObjectives: ["string"],
        focusAreas: [{ topic: "string", why: "string" }],
        commonPitfalls: [{ mistake: "string", fix: "string" }],
        selfCheck: ["string"],
        prerequisites: "string",
        nextStep: "string",
        estimatedTime: "string",
      },
      generatedAt: "ISO 8601 string",
    },
  });
}

"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Target,
  Focus,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Clock,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import { useLvxPaths } from "@/store/lvxpaths";
import {
  readLesson,
  writeLesson,
  type Lesson,
} from "@/lib/lesson-cache";
import { trackEvent } from "@/lib/track";
import { cn } from "@/lib/utils";

interface LessonPanelProps {
  itemId: string;
  onClose: () => void;
}

interface LessonResponse {
  lesson: Lesson;
  generatedAt: string;
}

interface LessonError {
  error: string;
  detail?: string;
}

// Expandable  lesson panel that appears below an item row when
export function LessonPanel({ itemId, onClose }: LessonPanelProps) {
  const catalog = useLvxPaths((s) => s.catalog);
  const catalogVersion = catalog?.version ?? 1;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!catalogVersion) return;
    // Best-effort telemetry — emit lesson_viewed on first mount.
    trackEvent("lesson_viewed", itemId);
    // Try cache first.
    const cached = readLesson(itemId, catalogVersion);
    if (cached) {
      setLesson(cached);
      setFromCache(true);
      return;
    }
    // No cache — fetch.
    void fetchLesson(false);
  }, [itemId, catalogVersion]);

  async function fetchLesson(force: boolean) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    setFromCache(false);
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
        signal: ctrl.signal,
      });
      const data = (await res.json()) as LessonResponse | LessonError;
      if (!res.ok || !("lesson" in data)) {
        setError((data as LessonError).error ?? `HTTP ${res.status}`);
        setLesson(null);
        return;
      }
      setLesson(data.lesson);
      setGeneratedAt(data.generatedAt);
      writeLesson(itemId, catalogVersion, data.lesson);
      setFromCache(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof Error ? e.message : "Network error — please retry."
      );
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    void fetchLesson(true);
  };

  return (
    <div className="fs-glass-strong relative overflow-hidden rounded-xl border-l-2 border-l-primary/60">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" />
              Lesson
            </span>
            {fromCache && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                cached
              </span>
            )}
            {generatedAt && !fromCache && (
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                just generated
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              aria-label="Regenerate lesson"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide lesson"
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Generating lesson plan…
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-3 rounded bg-muted-foreground/15 animate-pulse" style={{ width: `${100 - i * 15}%` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-1 text-xs underline-offset-4 hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Lesson content */}
        {lesson && !loading && !error && (
          <div className="mt-5 space-y-5">
            {lesson.estimatedTime && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.07] px-2.5 py-1 text-[11px] font-medium text-primary">
                <Clock className="h-3 w-3" />
                {lesson.estimatedTime}
              </div>
            )}

            <Section
              icon={Target}
              title="Learning objectives"
              accent="emerald"
            >
              <ul className="space-y-1.5">
                {lesson.learningObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                    <span className="mt-0.5 text-primary">→</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {lesson.focusAreas.length > 0 && (
              <Section icon={Focus} title="Focus areas" accent="emerald">
                <ul className="space-y-2">
                  {lesson.focusAreas.map((f, i) => (
                    <li key={i} className="text-xs leading-relaxed">
                      <span className="font-medium text-foreground">{f.topic}</span>
                      <span className="text-muted-foreground"> — {f.why}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {lesson.commonPitfalls.length > 0 && (
              <Section icon={AlertTriangle} title="Common pitfalls" accent="rose">
                <ul className="space-y-2">
                  {lesson.commonPitfalls.map((p, i) => (
                    <li key={i} className="rounded-lg border border-rose-500/20 bg-rose-500/[0.04] p-2">
                      <p className="text-xs leading-snug text-rose-200/90">
                        <span className="font-semibold">Pitfall:</span> {p.mistake}
                      </p>
                      <p className="mt-1 text-xs leading-snug text-foreground/80">
                        <span className="font-semibold text-primary">Fix:</span> {p.fix}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {lesson.selfCheck.length > 0 && (
              <Section icon={HelpCircle} title="Self-check" accent="emerald">
                <ol className="space-y-1.5">
                  {lesson.selfCheck.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                      <span className="fs-mono mt-0.5 text-primary">Q{i + 1}</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {(lesson.prerequisites || lesson.nextStep) && (
              <div className="grid gap-3 border-t border-border/40 pt-4 sm:grid-cols-2">
                {lesson.prerequisites && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Prerequisites
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                      {lesson.prerequisites}
                    </p>
                  </div>
                )}
                {lesson.nextStep && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <ArrowRight className="inline h-2.5 w-2.5 mr-1" />
                      Next step
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-primary/90">
                      {lesson.nextStep}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Disclaimer */}
            <p className="border-t border-border/40 pt-3 text-[10px] leading-relaxed text-muted-foreground/70">
              Teaching content that complements — never replaces —
              the free official resource above. Verify against the original;
              don&apos;t treat the summary as ground truth.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  accent: "emerald" | "rose";
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className={cn("h-3 w-3", accent === "rose" ? "text-rose-400" : "text-primary")} />
        {title}
      </h4>
      {children}
    </div>
  );
}

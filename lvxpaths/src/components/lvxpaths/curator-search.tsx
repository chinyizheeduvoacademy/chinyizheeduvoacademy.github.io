"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Search,
  Loader2,
  AlertCircle,
  X,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { useLvxPaths } from "@/store/lvxpaths";
import { NavLink } from "./nav-link";
import { PathIcon } from "./path-icon";
import type { CatalogItem, CatalogPath } from "@/lib/catalog";
import { trackEvent } from "@/lib/track";

interface CuratorItem {
  id: string;
  reason: string;
}
interface CuratorPath {
  id: string;
  reason: string;
}
interface CuratorResponse {
  summary?: string;
  paths?: CuratorPath[];
  items?: CuratorItem[];
  error?: string;
  detail?: string;
}

const EXAMPLE_QUERIES = [
  "I'm brand new to security, where do I start?",
  "I want to learn Linux privilege escalation",
  "Bug bounty for beginners",
  "I have CCNA, what's next for offensive security?",
  "Red-team AI and LLM attacks",
];

/**
 * AI curator search bar. Calls POST /api/curator with the user's natural
 * language question; the server-side LLM returns catalog item IDs + reasons.
 * The client resolves those IDs to actual catalog entries and renders the
 * recommendations inline.
 */
export function CuratorSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CuratorResponse | null>(null);
  const [hasFocus, setHasFocus] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const catalog = useLvxPaths((s) => s.catalog);

  // Resolve IDs returned by the LLM to actual catalog entries.
  const itemMap = catalog
    ? new Map(catalog.items.map((i) => [i.id, i]))
    : new Map();
  const pathMap = catalog
    ? new Map(catalog.paths.map((p) => [p.id, p]))
    : new Map();

  const runQuery = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || !catalog) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/curator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
        signal: ctrl.signal,
      });
      const data = (await res.json()) as CuratorResponse;
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setResult(null);
      } else {
        setResult(data);
        // Best-effort telemetry — count curator queries.
        trackEvent("curator_query");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(
        e instanceof Error ? e.message : "Network error — please retry."
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runQuery(query);
  };

  const handleClear = () => {
    setResult(null);
    setError(null);
    setQuery("");
    inputRef.current?.focus();
  };

  // Keyboard: Escape clears the result.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (result || error)) {
        handleClear();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result, error]);

  const showExamples = hasFocus && !query && !result && !loading;

  return (
    <section className="fs-glass-strong relative overflow-hidden rounded-2xl">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Curator
          </span>
          <span className="text-[11px] text-muted-foreground">
            Ask in plain English — only matches catalog items.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setHasFocus(true)}
              onBlur={() => setHasFocus(false)}
              placeholder="e.g. I'm new to security, where do I start?"
              aria-label="Ask the curator"
              maxLength={500}
              className="fs-mono h-11 w-full rounded-lg border border-border bg-secondary/40 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/60 focus:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear input"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30 disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {loading ? "Curating…" : "Ask"}
            </span>
          </button>
        </form>

        {/* Example queries */}
        {showExamples && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLE_QUERIES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  runQuery(ex);
                }}
                className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">{error}</p>
              <button
                type="button"
                onClick={handleClear}
                className="mt-1 text-xs underline-offset-4 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !error && (
          <CuratorResult
            result={result}
            itemMap={itemMap}
            pathMap={pathMap}
            onClear={handleClear}
          />
        )}
      </div>
    </section>
  );
}

function CuratorResult({
  result,
  itemMap,
  pathMap,
  onClear,
}: {
  result: CuratorResponse;
  itemMap: Map<string, CatalogItem>;
  pathMap: Map<string, CatalogPath>;
  onClear: () => void;
}) {
  const resolvedPaths = (result.paths ?? [])
    .map((p) => ({ reason: p.reason, path: pathMap.get(p.id) }))
    .filter((x) => Boolean(x.path));
  const resolvedItems = (result.items ?? [])
    .map((i) => ({ reason: i.reason, item: itemMap.get(i.id) }))
    .filter((x) => Boolean(x.item));

  if (!result.summary && resolvedPaths.length === 0 && resolvedItems.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        The curator didn&apos;t find a clear match. Try rephrasing — e.g.
        &quot;I want to break into bug bounty with no prior experience.&quot;
        <button
          type="button"
          onClick={onClear}
          className="ml-2 text-primary underline-offset-4 hover:underline"
        >
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {result.summary && (
        <div className="rounded-lg border border-primary/20 bg-primary/[0.05] p-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            <span className="font-semibold text-primary">Curator:</span>{" "}
            {result.summary}
          </p>
        </div>
      )}

      {resolvedPaths.length > 0 && (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommended paths
          </h4>
          <div className="flex flex-wrap gap-2">
            {resolvedPaths.map(({ reason, path }) => (
              <NavLink
                key={path!.id}
                href={`#/path/${path!.id}`}
                className="group inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                <span className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-primary ring-1 ring-primary/25">
                  <PathIcon name={path!.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">{path!.name}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {resolvedItems.length > 0 && (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Start with these ({resolvedItems.length})
          </h4>
          <ol className="space-y-2">
            {resolvedItems.map(({ reason, item }, idx) => (
              <li
                key={item!.id}
                className="fs-glass flex items-start gap-3 rounded-lg p-3"
              >
                <span className="fs-mono mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <NavLink
                      href={`#/path/${item!.path}`}
                      className="text-sm font-semibold hover:text-primary"
                    >
                      {item!.title}
                    </NavLink>
                    <a
                      href={item!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item!.provider} in a new tab`}
                      className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded border border-border bg-secondary/40 text-muted-foreground transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    <span className="font-medium text-foreground/70">
                      {item!.provider}
                    </span>{" "}
                    · <span className="capitalize">{item!.level}</span> ·{" "}
                    {item!.type}
                  </p>
                  <p className="mt-1.5 text-xs leading-snug text-primary/90">
                    {reason}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3 w-3" />
        Clear result
      </button>
    </div>
  );
}

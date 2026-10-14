"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  AlertCircle,
  ExternalLink,
  Square,
  Play,
  RefreshCw,
  FlaskConical,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LabConfig } from "@/lib/catalog";

interface LabLauncherProps {
  itemId: string;
  lab: LabConfig;
}

interface LabSession {
  session_id?: string;
  item_id: string;
  lab_url: string;
  started_at?: string;
  expires_at?: string;
  stopped_at?: string | null;
  status: "starting" | "running" | "stopped" | "expired" | "failed";
  source?: "fly.io" | "sandbox";
}

interface LabError {
  error: string;
  detail?: string;
}

// Self-hosted lab launcher
export function LabLauncher({ itemId, lab }: LabLauncherProps) {
  const [session, setSession] = useState<LabSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount, check if there's already a running lab for this item.
  useEffect(() => {
    void checkStatus();
  }, [itemId]);

  // Countdown timer while running.
  useEffect(() => {
    if (!session?.expires_at || session.status !== "running") {
      setRemainingSeconds(null);
      return;
    }
    const update = () => {
      const remaining = Math.max(
        0,
        Math.floor((Date.parse(session.expires_at!) - Date.now()) / 1000)
      );
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        // Expired — refresh status.
        void checkStatus();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Poll status every 30s while running (catches server-side expiry).
  useEffect(() => {
    if (session?.status !== "running") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => void checkStatus(), 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session?.status]);

  async function checkStatus() {
    try {
      const res = await fetch(`/api/lab/status?item_id=${encodeURIComponent(itemId)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setSession(null);
        return;
      }
      const data = (await res.json()) as LabSession;
      setSession(data);
    } catch {
      // Silent — status check is best-effort.
    }
  }

  async function launchLab() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lab/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = (await res.json()) as LabSession | LabError;
      if (!res.ok || !("status" in data)) {
        setError((data as LabError).error ?? `HTTP ${res.status}`);
        return;
      }
      setSession(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function stopLab() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lab/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      const data = (await res.json()) as LabSession | LabError;
      if (!res.ok && "error" in data) {
        setError(data.error);
      }
      setSession(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  // Collapsed state — just the launch button.
  if (!session && !error && !loading) {
    return (
      <button
        type="button"
        onClick={launchLab}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
      >
        <FlaskConical className="h-3 w-3" />
        {lab.launch_text ?? "Launch lab"}
      </button>
    );
  }

  return (
    <div className="mt-3 fs-glass-strong rounded-xl border border-primary/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              session?.status === "running"
                ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                : session?.status === "starting"
                  ? "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30"
                  : "bg-secondary/40 text-muted-foreground ring-1 ring-border"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                session?.status === "running"
                  ? "bg-primary animate-pulse"
                  : session?.status === "starting"
                    ? "bg-amber-400 animate-pulse"
                    : "bg-muted-foreground"
              )}
            />
            {session?.status === "running" ? "Lab running" : session?.status === "starting" ? "Spinning up…" : session?.status ?? "lab"}
          </span>
          {session?.source && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
              {session.source === "fly.io" ? "fly.io" : "sandbox"}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse lab panel" : "Expand lab panel"}
          className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {session?.status === "starting" ? "Spinning up lab container…" : "Working…"}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                void launchLab();
              }}
              className="mt-1 text-[11px] underline-offset-4 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Running state */}
      {session?.status === "running" && !loading && !error && expanded && (
        <div className="mt-3 space-y-3">
          {/* Countdown + URL */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground fs-mono">
              <Clock className="h-3 w-3" />
              {remainingSeconds !== null ? formatRemaining(remainingSeconds) : "—"}
            </div>
            <div className="flex items-center gap-2">
              <a
                href={session.lab_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110"
              >
                <ExternalLink className="h-3 w-3" />
                Open lab
              </a>
              <button
                type="button"
                onClick={stopLab}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              >
                <Square className="h-3 w-3" />
                Stop
              </button>
            </div>
          </div>

          {/* Lab URL display (mono, truncated) */}
          <div className="fs-mono truncate rounded-md border border-border/40 bg-background/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            {session.lab_url}
          </div>

          <p className="text-[10px] leading-relaxed text-muted-foreground/70">
            {session.source === "sandbox"
              ? "Sandbox mode — the lab URL points to the official resource. In production (with FLY_API_TOKEN set), this would open a self-hosted fly.io container that auto-stops when the timer hits zero."
              : "Container auto-stops when the timer hits zero. Stop manually to free resources sooner."}
          </p>
        </div>
      )}

      {/* Starting state */}
      {session?.status === "starting" && !loading && expanded && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          Provisioning Docker container…
        </div>
      )}
    </div>
  );
}

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return "expired";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s left`;
}

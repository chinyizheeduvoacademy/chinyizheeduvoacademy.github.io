/**
 * LvxPaths — catalog types and helpers.
 *
 * Source of truth lives at /public/data/catalog.json. The shape mirrors the
 * AGENTS.md spec verbatim so the same file can be dropped into a vanilla
 * GitHub Pages build later without modification.
 */

export type CatalogLevel = "beginner" | "intermediate" | "advanced";

export type CatalogType =
  | "course"
  | "videos"
  | "interactive"
  | "labs"
  | "ctf"
  | "reference"
  | "tool"
  | "articles";

export interface CatalogPath {
  id: string;
  name: string;
  icon: string; // icon key resolved by PathIcon component
  blurb: string;
}

export interface CatalogItem {
  id: string;
  path: string; // foreign key -> CatalogPath.id
  title: string;
  provider: string;
  url: string;
  type: CatalogType;
  level: CatalogLevel;
  hours_est: number;
  tags: string[];
  free_note?: string;
  /** Item is offensive-security focused (pentest / privesc / red team). */
  offsec?: boolean;
  /** Item covers AI / LLM content explicitly (curriculum or tool). */
  ai_assisted?: boolean;
  /** Optional self-hosted lab config — when present, the item row shows a "Launch lab" button. */
  lab?: LabConfig;
}

/**
 * Self-hosted lab configuration. When an item has this, the catalog
 * signals that LvxPaths can spin up an isolated Docker container (via
 * fly.io in production, in-memory sandbox fallback for preview) so the
 * learner can practice without paying for HTB Pro / TryHackMe Premium.
 */
export interface LabConfig {
  /** Docker image — e.g. "ghcr.io/chinyizheeduvoacademy/lv-lab-juice-shop:latest" */
  image: string;
  /** web = open a URL in the browser; ssh = SSH into the VM */
  type: "web" | "ssh";
  /** For web labs: the port the container exposes (default 3000). */
  port?: number;
  /** Custom button text (default: "Launch lab"). */
  launch_text?: string;
  /** Auto-stop after N minutes of inactivity (default: 120). */
  timeout_minutes?: number;
}

export interface Catalog {
  version: number;
  paths: CatalogPath[];
  items: CatalogItem[];
}

/** Fetch and validate the catalog. Safe to call from client components. */
export async function fetchCatalog(): Promise<Catalog> {
  const res = await fetch("/data/catalog.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load catalog: HTTP ${res.status}`);
  }
  const data = (await res.json()) as Catalog;
  if (!data.paths || !data.items) {
    throw new Error("Catalog missing required `paths` or `items` arrays");
  }
  return data;
}

/** Defensive HTML escaper — used on every piece of catalog text before render. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Format an estimated-hours number into a compact, human-readable label.
 * 0 -> "self-paced", 100 -> "100h", 1500 -> "1.5k h"
 */
export function formatHours(hours: number): string {
  if (!hours || hours <= 0) return "self-paced";
  if (hours < 1000) return `${hours}h`;
  return `${(hours / 1000).toFixed(1)}k h`;
}

/** Sum the estimated hours for a list of items (used by stats + path cards). */
export function totalHoursForItems(items: CatalogItem[]): number {
  return items.reduce((sum, i) => sum + (i.hours_est || 0), 0);
}

/** Return items grouped by path id, preserving catalog order. */
export function groupItemsByPath(
  items: CatalogItem[]
): Record<string, CatalogItem[]> {
  return items.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    (acc[item.path] ||= []).push(item);
    return acc;
  }, {});
}

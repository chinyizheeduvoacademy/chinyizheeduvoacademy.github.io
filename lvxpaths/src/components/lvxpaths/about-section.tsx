"use client";

import {
  Github,
  GraduationCap,
  Terminal,
  Heart,
  Database,
  ArrowRight,
  Linkedin,
} from "lucide-react";
import { NavLink } from "./nav-link";
import { useLvxPaths } from "@/store/lvxpaths";
import { formatHours, totalHoursForItems } from "@/lib/catalog";

/**
 * About page (#/about route). The personal story behind LvxPaths.
 *
 * Per the user's brief: this is the "first post" — a self-authored bio about
 * Chin Yi Zhe, the Eduvo Academy → OffSec pivot, and why this platform
 * exists for budget-constrained students.
 *
 * Tone: honest, personal, no buzzwords. Reads as the founder's note on a
 * fundraising deck, not a generic about-us page.
 */
export function AboutSection() {
  const catalog = useLvxPaths((s) => s.catalog);
  const totalItems = catalog?.items.length ?? 0;
  const totalPaths = catalog?.paths.length ?? 0;
  const totalHours = catalog ? totalHoursForItems(catalog.items) : 0;

  return (
    <div className="space-y-8">
      {/* Identity card */}
      <section className="fs-glass-strong relative overflow-hidden rounded-2xl p-6 sm:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary/[0.08] blur-3xl"
          aria-hidden
        />
        <div className="relative grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="grid h-28 w-28 place-items-center rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent ring-2 ring-primary/30">
              <span className="fs-mono text-3xl font-bold text-primary">CYZ</span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Curator
            </span>
          </div>

          {/* Bio */}
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              About the curator
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Chin Yi Zhe
            </h1>
            <p className="mt-2 text-sm text-primary">
              OffSec practitioner · Kuala Lumpur, Malaysia
            </p>

            <div className="mt-5 space-y-4 text-sm leading-relaxed text-foreground/90">
              <p>
                I studied at{" "}
                <a
                  href="https://eduvoacademy.edu.my/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Eduvo Academy
                </a>{" "}
                for a <span className="font-semibold">Professional Diploma in Software Engineering</span>.
                The pitch was simple: graduate, complete a six-month industry
                internship, walk into a job.
              </p>
              <p>
                The pitch didn&apos;t survive contact with the market. The
                internship pipeline collapsed — companies stopped taking
                interns, or paid them nothing, or ghosted after the third
                round. The diploma alone wasn&apos;t enough to land a first
                role. Sound familiar? It should — that&apos;s the story of
                roughly every fresh Malaysian SWE graduate right now.
              </p>
              <p>
                So I pivoted. I went deep on{" "}
                <span className="font-semibold">offensive security</span> —
                the hands-on work hiring managers actually respect over
                paper. My personal practice lives at{" "}
                <a
                  href="https://github.com/chinyizheeduvoacademy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Github className="h-3.5 w-3.5" />
                  github.com/chinyizheeduvoacademy
                </a>{" "}
                — CTFs, privesc chains, reverse engineering, the actual reps.
              </p>
              <p>
                This platform exists because every resource that actually
                taught me was <span className="font-semibold">free</span> —
                PortSwigger, Professor Messer, TCM&apos;s free TryHackMe
                rooms, Jeremy&apos;s CCNA. The only barrier was knowing
                which ones to do, in what order, and that they were even
                there. LvxPaths removes that barrier for the next
                student — Malaysian or otherwise — who can&apos;t afford
                paid training.
              </p>
            </div>

            {/* Identity pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill icon={GraduationCap} label="Eduvo Academy · former student" />
              <Pill icon={Terminal} label="OffSec & Software Engineering" />
              <Pill icon={Heart} label="Built for budget-constrained students" />
            </div>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://github.com/chinyizheeduvoacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-primary/30"
              >
                <Github className="h-4 w-4" />
                GitHub Profile
              </a>
              <a
                href="https://www.linkedin.com/in/chinjyzheed/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                <Linkedin className="h-4 w-4" />
                LinkedIn
              </a>
              <NavLink
                href="#/"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground/90 transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                Browse the catalog
                <ArrowRight className="h-4 w-4" />
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Mission + roadmap */}
      <section className="grid gap-4 md:grid-cols-3">
        <MissionCard
          icon={Heart}
          title="Why this exists"
          body="Free resources aren't the bottleneck — discoverability and ordering are. LvxPaths fixes both, no login, no upsell, no paywall."
        />
        <MissionCard
          icon={Database}
          title="What's next"
          body="ClickHouse-backed telemetry so the catalog adapts to what learners actually complete. A small fundraiser will fund hosting + an AI curator."
        />
        <MissionCard
          icon={Terminal}
          title="Who it's for"
          body="Malaysian and SE-Asian students who can't afford $300 bootcamps. Anyone starting late, starting over, or starting with nothing but a laptop."
        />
      </section>

      {/* Catalog stats */}
      <section className="fs-glass rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              The catalog, today
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every resource is free and official. Curated by hand, not
              scraped. We link, we never host.
            </p>
          </div>
          <div className="flex gap-6">
            <Stat label="Paths" value={String(totalPaths)} />
            <Stat label="Resources" value={String(totalItems)} />
            <Stat label="Est. hours" value={formatHours(totalHours)} />
          </div>
        </div>
      </section>

      {/* Disclaimer restated */}
      <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 text-center">
        <p className="text-xs leading-relaxed text-primary/90">
          All content belongs to its creators. LvxPaths links only to
          free, official sources — we never host, mirror, or proxy paid
          material. This is a curation project, not a leak site.
        </p>
      </section>
    </div>
  );
}

function Pill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-foreground/80">
      <Icon className="h-3 w-3 text-muted-foreground" />
      {label}
    </span>
  );
}

function MissionCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="fs-glass rounded-xl p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="fs-mono text-lg font-bold">{value}</p>
    </div>
  );
}

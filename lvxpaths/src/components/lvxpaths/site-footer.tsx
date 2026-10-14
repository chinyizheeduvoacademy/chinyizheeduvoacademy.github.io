"use client";

import { Heart, ExternalLink } from "lucide-react";
import { NavLink } from "./nav-link";

/**
 * Sticky footer (pinned to bottom via `mt-auto` on a flex-col root).
 * Carries the AGENTS.md-mandated disclaimer + project links.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold">LvxPaths</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                curated by Chin Yi Zhe
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              All content belongs to its creators. We only link to free
              official sources — never host, mirror, or proxy. Curated by an
              OffSec practitioner for students who can&apos;t afford paid
              training.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/80">
              <a
                href="https://github.com/chinyizheeduvoacademy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                github.com/chinyizheeduvoacademy
              </a>
              {" "}· Kuala Lumpur · Free & open-source community roadmaps.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catalog
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <NavLink
                    href="#/path/foundations"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Foundations
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="#/path/networking"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Networking
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="#/path/linux"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Linux &amp; PrivEsc
                  </NavLink>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                More paths
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <NavLink
                    href="#/path/windows"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Windows &amp; PrivEsc
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="#/path/web"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Web &amp; Bounty
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    href="#/path/blueteam"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Blue Team
                  </NavLink>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <NavLink
                    href="#/about"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    About the curator
                  </NavLink>
                </li>
                <li>
                  <a
                    href="https://github.com/chinyizheeduvoacademy/chinyizheeduvoacademy.github.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground/80 transition-colors hover:text-primary"
                  >
                    Source
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <NavLink
                    href="#/"
                    className="text-foreground/80 transition-colors hover:text-primary"
                  >
                    Back home
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-start gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LvxPaths · A non-commercial
            curation project.
          </p>
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            Made with{" "}
            <Heart className="h-3 w-3 text-primary" /> for the next generation
            of hackers.
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { type ReactNode, type MouseEvent } from "react";

/**
 * Hash-aware anchor. Renders as a real `<a href="#/path/foo">` so it's
 * right-clickable and SEO-friendly, but intercepts plain left-clicks to do a
 * smooth in-app navigation without a full reload.
 */
interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function NavLink({
  href,
  children,
  className,
  "aria-label": ariaLabel,
}: NavLinkProps) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle modifier-clicks / non-primary buttons natively.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (typeof window !== "undefined" && window.location.hash !== href) {
      window.location.hash = href;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

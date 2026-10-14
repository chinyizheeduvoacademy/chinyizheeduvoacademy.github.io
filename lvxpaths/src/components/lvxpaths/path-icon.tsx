"use client";

import {
  Compass,
  Network,
  Terminal,
  Monitor,
  Globe,
  Shield,
  Brain,
  CodeXml,
  SearchCode,
  Swords,
  Cloud,
  type LucideIcon,
} from "lucide-react";

/**
 * Resolve the `icon` key on a CatalogPath to a Lucide component.
 * The catalog.json stores icon as a string key (e.g. "compass") so the same
 * file can be dropped into a vanilla HTML build without bundling React.
 */
const ICONS: Record<string, LucideIcon> = {
  compass: Compass,
  network: Network,
  terminal: Terminal,
  monitor: Monitor,
  globe: Globe,
  shield: Shield,
  brain: Brain,
  code: CodeXml, // exploit writing
  "search-code": SearchCode, // reverse engineering
  swords: Swords, // red teaming
  cloud: Cloud, // cloud security
};

export function PathIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? Compass;
  return <Icon className={className} aria-hidden="true" />;
}

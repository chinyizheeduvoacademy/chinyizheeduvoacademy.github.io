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

// Resolve the `icon` key on a CatalogPath to a Lucide component
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

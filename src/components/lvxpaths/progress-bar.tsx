"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  // Completion percentage, clamped to [0, 100]
  pct: number;
  className?: string;
}

// Linear progress bar built on shadcn/ui Progress (which uses Radix)
export function ProgressBar({ pct, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return <Progress value={clamped} className={cn("h-2", className)} />;
}

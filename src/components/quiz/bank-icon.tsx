"use client";

import {
  Landmark,
  Brain,
  SpellCheck,
  Globe2,
  TrendingUp,
  BookMarked,
  Mountain,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Landmark,
  Brain,
  SpellCheck,
  Globe2,
  TrendingUp,
  BookMarked,
  Mountain,
};

export function BankIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name] ?? Landmark;
  return <Icon className={className} />;
}

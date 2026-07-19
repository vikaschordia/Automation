"use client";

import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";

// Validated categorical/status hexes from the dataviz skill's reference palette
// (references/palette.md) — reused here so chart marks reinforce the same meaning
// as the priority/status badges elsewhere in the app (red = urgent/delay, green = good).
const LIGHT = {
  primary: "#2a78d6",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
};

const DARK = {
  primary: "#3987e5",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
  grid: "#2c2c2a",
  axis: "#383835",
  muted: "#898781",
  ink: "#ffffff",
};

export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  return mounted && resolvedTheme === "dark" ? DARK : LIGHT;
}

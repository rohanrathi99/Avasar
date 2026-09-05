import { useColorScheme } from "react-native";

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  success: string;
  warning: string;
  danger: string;
  scoreHigh: string;
  scoreMid: string;
  scoreLow: string;
  overlay: string;
}

const light: ThemeColors = {
  background: "#F7F7F8",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F0F2",
  border: "#E2E2E7",
  text: "#111114",
  textMuted: "#6B6B76",
  primary: "#4F46E5",
  primaryText: "#FFFFFF",
  success: "#15803D",
  warning: "#B45309",
  danger: "#B91C1C",
  scoreHigh: "#15803D",
  scoreMid: "#B45309",
  scoreLow: "#9CA3AF",
  overlay: "rgba(0,0,0,0.35)",
};

const dark: ThemeColors = {
  background: "#0B0B0F",
  surface: "#16161C",
  surfaceAlt: "#1F1F27",
  border: "#2A2A34",
  text: "#F3F3F5",
  textMuted: "#9A9AA6",
  primary: "#7C74F0",
  primaryText: "#0B0B0F",
  success: "#4ADE80",
  warning: "#FBBF24",
  danger: "#F87171",
  scoreHigh: "#4ADE80",
  scoreMid: "#FBBF24",
  scoreLow: "#6B7280",
  overlay: "rgba(0,0,0,0.6)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return { colors: isDark ? dark : light, dark: isDark };
}

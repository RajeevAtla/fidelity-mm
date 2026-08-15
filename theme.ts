export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function parseThemeMode(value: unknown): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveThemeMode(mode: ThemeMode, prefersDark: boolean): ResolvedTheme {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  return prefersDark ? "dark" : "light";
}

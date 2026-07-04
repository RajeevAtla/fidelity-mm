export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type Category = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";

export const THEME_STORAGE_KEY = "fidelity-mm-theme-mode";
const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  light: "#edf3f8",
  dark: "#000000",
};

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    return "system";
  }

  return "system";
}

export function resolveThemeMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") {
    return mode;
  }

  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

export function applyThemeToDocument(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;

  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = THEME_META_COLORS[theme];
}

import { parseThemeMode, type ResolvedTheme, type ThemeMode } from "./theme";

const DARK_MODE_QUERY = "(prefers-color-scheme: dark)";

export function readStoredThemeMode(storageKey: string): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    return parseThemeMode(window.localStorage.getItem(storageKey));
  } catch {
    return "system";
  }
}

export function writeStoredThemeMode(storageKey: string, mode: ThemeMode): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Ignore storage failures.
  }
}

export function getSystemThemePreference(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(DARK_MODE_QUERY).matches
    : false;
}

export function subscribeToSystemThemePreference(onChange: (prefersDark: boolean) => void): (() => void) | undefined {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return undefined;
  }

  const media = window.matchMedia(DARK_MODE_QUERY);
  const update = () => onChange(media.matches);

  update();

  if (media.addEventListener) {
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }

  media.addListener(update);
  return () => media.removeListener(update);
}

export function applyThemeToDocument(
  theme: ResolvedTheme,
  metaColors: Readonly<Record<ResolvedTheme, string>>,
): void {
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
  themeMeta.content = metaColors[theme];
}

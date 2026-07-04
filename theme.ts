export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type Category = "p" | "g" | "t" | "nm" | "nj" | "ny" | "ca" | "ma";

type CategoryTone = {
  fill: string;
  soft: string;
  border: string;
  text: string;
};

export type ThemeTokens = {
  pageBg: string;
  pageBgAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  subtle: string;
  border: string;
  borderStrong: string;
  accentFederal: string;
  accentState: string;
  chartTrack: string;
  chartTrackBorder: string;
  successBg: string;
  successBorder: string;
  successText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  selectionBg: string;
  selectionBorder: string;
  selectionText: string;
  neutralButtonBg: string;
  neutralButtonText: string;
  neutralButtonBorder: string;
  neutralButtonActiveBg: string;
  neutralButtonActiveText: string;
  tableHeaderBg: string;
  tableHeaderBorder: string;
  tableCellBorder: string;
  cardShadow: string;
  bestBarStart: string;
  bestBarEnd: string;
  category: Record<Category, CategoryTone>;
};

export const THEME_STORAGE_KEY = "fidelity-mm-theme-mode";

const LIGHT_CATEGORY: Record<Category, CategoryTone> = {
  p: { fill: "#f4a7a7", soft: "#fff0f0", border: "#df7a7a", text: "#641818" },
  g: { fill: "#d8b4e2", soft: "#f8eefb", border: "#b98ac8", text: "#4f235e" },
  t: { fill: "#ffe28a", soft: "#fff9df", border: "#efc74d", text: "#6a5400" },
  nm: { fill: "#b7dfb6", soft: "#edf8ed", border: "#8bc18a", text: "#1d4f1c" },
  nj: { fill: "#a6cdf7", soft: "#edf5ff", border: "#73a8dc", text: "#1a4e7a" },
  ny: { fill: "#9bdad3", soft: "#edf9f7", border: "#64b7ae", text: "#185f59" },
  ca: { fill: "#ffd59b", soft: "#fff5e5", border: "#e3af58", text: "#7d4f00" },
  ma: { fill: "#c8b3ab", soft: "#f6f1ef", border: "#a6867d", text: "#5d473f" },
};

const DARK_CATEGORY: Record<Category, CategoryTone> = {
  p: { fill: "#ff6f63", soft: "#2c1617", border: "#ff8c80", text: "#ffe4e2" },
  g: { fill: "#c89bf0", soft: "#241c31", border: "#d6b2f6", text: "#f4ebff" },
  t: { fill: "#ffd24d", soft: "#2a240f", border: "#ffe08a", text: "#fff2c2" },
  nm: { fill: "#84d784", soft: "#162118", border: "#a9dda9", text: "#e5fae5" },
  nj: { fill: "#5fb8ff", soft: "#102131", border: "#92cbff", text: "#d9eeff" },
  ny: { fill: "#57cfc4", soft: "#112623", border: "#8cd5cd", text: "#ddfffb" },
  ca: { fill: "#ffbf55", soft: "#2c2211", border: "#ffd08c", text: "#ffe9c6" },
  ma: { fill: "#b89f96", soft: "#241f1d", border: "#ccb5ad", text: "#f2e9e6" },
};

export const THEMES: Record<ResolvedTheme, ThemeTokens> = {
  light: {
    pageBg: "#edf3f8",
    pageBgAlt: "#e2eaf2",
    surface: "#ffffff",
    surfaceAlt: "#f7fbff",
    text: "#102033",
    muted: "#516173",
    subtle: "#738192",
    border: "#c9d5e1",
    borderStrong: "#8fa0b4",
    accentFederal: "#2457d6",
    accentState: "#1e8e4a",
    chartTrack: "#dce5ef",
    chartTrackBorder: "#c4cfdb",
    successBg: "#eaf7ef",
    successBorder: "#9dcdad",
    successText: "#1d4f31",
    warningBg: "#fff4cc",
    warningBorder: "#e0bf58",
    warningText: "#705500",
    selectionBg: "#fff0b3",
    selectionBorder: "#d39d00",
    selectionText: "#2f2400",
    neutralButtonBg: "#ffffff",
    neutralButtonText: "#203147",
    neutralButtonBorder: "#c9d5e1",
    neutralButtonActiveBg: "#223247",
    neutralButtonActiveText: "#ffffff",
    tableHeaderBg: "#eef4fa",
    tableHeaderBorder: "#9dacbd",
    tableCellBorder: "#d4dde7",
    cardShadow: "0 8px 22px rgba(16, 32, 51, 0.08)",
    bestBarStart: "#2e7d32",
    bestBarEnd: "#66bb6a",
    category: LIGHT_CATEGORY,
  },
  dark: {
    pageBg: "#000000",
    pageBgAlt: "#090909",
    surface: "#111111",
    surfaceAlt: "#161616",
    text: "#f5f7fa",
    muted: "#c1c8d2",
    subtle: "#8e96a2",
    border: "#2e2e2e",
    borderStrong: "#4a4a4a",
    accentFederal: "#8eb7ff",
    accentState: "#8ad39a",
    chartTrack: "#121212",
    chartTrackBorder: "#2a2a2a",
    successBg: "#0b140d",
    successBorder: "#255236",
    successText: "#e0f5e6",
    warningBg: "#171300",
    warningBorder: "#6f560e",
    warningText: "#ffebaf",
    selectionBg: "#201800",
    selectionBorder: "#d1a21f",
    selectionText: "#fff4cf",
    neutralButtonBg: "#111111",
    neutralButtonText: "#f5f7fa",
    neutralButtonBorder: "#2f2f2f",
    neutralButtonActiveBg: "#e7edf4",
    neutralButtonActiveText: "#111111",
    tableHeaderBg: "#101010",
    tableHeaderBorder: "#383838",
    tableCellBorder: "#242424",
    cardShadow: "0 14px 30px rgba(0, 0, 0, 0.5)",
    bestBarStart: "#16a34a",
    bestBarEnd: "#22c55e",
    category: DARK_CATEGORY,
  },
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

  const tokens = THEMES[theme];
  const root = document.documentElement;
  const body = document.body;

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.style.backgroundColor = tokens.pageBg;
  body.style.backgroundColor = tokens.pageBg;
  body.style.color = tokens.text;
  body.style.margin = "0";
  body.style.minHeight = "100vh";

  let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = tokens.pageBg;
}

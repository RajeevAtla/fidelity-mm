import { describe, expect, test } from "bun:test";
import { getSystemThemePreference, subscribeToSystemThemePreference } from "../../../src/ui/theme-browser";

describe("browser theme boundary", () => {
  test("falls back to the light system theme without matchMedia", () => {
    const root = globalThis as unknown as Record<string, unknown>;
    const originalWindow = root.window;
    root.window = {};

    try {
      expect(getSystemThemePreference()).toBe(false);
      expect(subscribeToSystemThemePreference(() => {})).toBeUndefined();
    } finally {
      root.window = originalWindow;
    }
  });
});

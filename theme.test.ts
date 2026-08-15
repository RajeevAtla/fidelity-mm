import { describe, expect, test } from "bun:test";
import { parseThemeMode, resolveThemeMode } from "./theme";

describe("theme model", () => {
  test("parses only supported stored modes", () => {
    expect(parseThemeMode("light")).toBe("light");
    expect(parseThemeMode("dark")).toBe("dark");
    expect(parseThemeMode("system")).toBe("system");
    expect(parseThemeMode(null)).toBe("system");
    expect(parseThemeMode("sepia")).toBe("system");
    expect(parseThemeMode(1)).toBe("system");
  });

  test("resolves explicit modes without consulting system preference", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });

  test("resolves system mode from an explicit preference", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });
});

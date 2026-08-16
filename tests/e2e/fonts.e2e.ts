import { expect, test } from "@playwright/test";

test("visible typefaces load from WOFF2", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();

  const fontState = await page.evaluate(async () => {
    await document.fonts.ready;
    const loadedFonts = [...document.fonts]
      .map(({ family, status }) => `${family.replace(/"/g, "")}:${status}`)
      .sort();
    const resources = performance
      .getEntriesByType("resource")
      .map(({ name }) => name)
      .filter((name) => /\.(ttf|woff2)(?:$|\?)/i.test(name));

    return {
      loadedFonts,
      resources,
      bodyFamily: getComputedStyle(document.body).fontFamily,
      headingFamily: getComputedStyle(document.querySelector("h1")!).fontFamily,
    };
  });

  expect(fontState.loadedFonts).toEqual(["Soft Grotesk:loaded", "Tripsis:loaded"]);
  expect(fontState.resources).toHaveLength(2);
  expect(fontState.resources.every((resource) => new URL(resource).pathname.endsWith(".woff2"))).toBe(true);
  expect(fontState.bodyFamily).toContain("Soft Grotesk");
  expect(fontState.headingFamily).toContain("Tripsis");
});

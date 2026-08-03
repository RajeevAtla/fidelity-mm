import { expect, test } from "@playwright/test";

test("core fund comparison controls work", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();

  const fundList = page.locator("#fund-list");
  await expect(fundList.locator(":scope > div")).toHaveCount(15);

  await page.getByRole("button", { name: /^Prime/ }).click();
  await expect(page.getByRole("button", { name: /^Prime/ })).toHaveAttribute("aria-pressed", "true");
  await expect(fundList).toHaveAttribute("aria-label", /\d+ funds shown/);

  const federalBracket = page.getByRole("slider", { name: "Federal marginal tax bracket" });
  const originalBracket = await federalBracket.getAttribute("aria-valuetext");
  await federalBracket.fill(await federalBracket.getAttribute("max") ?? "0");
  await expect(federalBracket).not.toHaveAttribute("aria-valuetext", originalBracket ?? "");

  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "All funds" }).click();
  await page.getByRole("button", { name: /Show all 40 funds/ }).click();
  await expect(fundList.locator(":scope > div")).toHaveCount(40);
  await expect(page.getByRole("button", { name: /Show only the top/ })).toBeVisible();
});

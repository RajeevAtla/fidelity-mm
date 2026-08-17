import { expect, test } from "@playwright/test";

test("recovers from a failed data load with the in-page retry button", async ({ page }) => {
  let rateSheetRequests = 0;
  await page.route("**/fidelity-mm/data/fidelity-mm-allclass.json", async (route) => {
    rateSheetRequests += 1;
    if (rateSheetRequests === 1) {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.goto("./");
  await expect(page.getByRole("heading", { name: "Fidelity data is temporarily unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Retry loading Fidelity data" }).click();
  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();
  expect(rateSheetRequests).toBe(2);
});

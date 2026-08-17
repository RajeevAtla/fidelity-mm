import { expect, test } from "@playwright/test";

test("core fund comparison controls work", async ({ page }) => {
  const dataRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/fidelity-mm/data/")) dataRequests.push(new URL(request.url()).pathname);
  });

  await page.goto("./");
  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();
  expect(dataRequests.sort()).toEqual([
    "/fidelity-mm/data/fidelity-mm-allclass.json",
    "/fidelity-mm/data/fidelity-mm-minimums.json",
    "/fidelity-mm/data/fidelity-mm-tax-rules.json",
  ]);

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

test("resident state selection updates the tax profile", async ({ page }) => {
  await page.goto("./");

  const residentState = page.getByRole("combobox", { name: "Resident state" });
  await expect(residentState.locator("option")).toHaveCount(50);
  await page.getByRole("button", { name: /Show all 40 funds/ }).click();

  const njFundYield = await page.getByRole("img", { name: /FSKXX .*after-tax yield/ }).getAttribute("aria-label");
  await residentState.selectOption("ny");
  await expect(page.getByRole("slider", { name: "NY marginal tax bracket" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Winner by federal and NY tax bracket" })).toBeVisible();
  const nyFundYield = await page.getByRole("img", { name: /FSKXX .*after-tax yield/ }).getAttribute("aria-label");
  expect(nyFundYield).not.toBe(njFundYield);

  await residentState.selectOption("tx");
  await expect(page.getByRole("slider", { name: "TX marginal tax bracket" })).toHaveAttribute(
    "aria-valuetext",
    "0% · No ordinary income tax",
  );

  await residentState.selectOption("wa");
  await expect(page.getByRole("slider", { name: "WA marginal tax bracket" })).toHaveAttribute(
    "aria-valuetext",
    "0% · Ordinary income not taxed",
  );
  await expect(page.getByRole("status").filter({ hasText: "capital-gains" })).toBeVisible();
});

test("restores every scenario field from a shareable URL", async ({ page }) => {
  await page.goto("./?state=ny&fi=2&ni=2&category=all&balance=1250000&expanded=true");

  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Resident state" })).toHaveValue("ny");
  await expect(page.getByRole("slider", { name: "Federal marginal tax bracket" })).toHaveValue("2");
  await expect(page.getByRole("slider", { name: "NY marginal tax bracket" })).toHaveValue("2");
  await expect(page.getByRole("button", { name: "All funds" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("spinbutton", { name: "Annual balance" })).toHaveValue("1250000");
  await expect(page.getByRole("button", { name: "Show only the top initial funds" })).toHaveAttribute("aria-expanded", "true");

  const params = new URL(page.url()).searchParams;
  expect([...params.keys()]).toEqual(["state", "fi", "ni", "category", "balance", "expanded"]);
  expect(params.get("state")).toBe("ny");
  expect(params.get("fi")).toBe("2");
  expect(params.get("ni")).toBe("2");
  expect(params.get("category")).toBe("all");
  expect(params.get("balance")).toBe("1250000");
  expect(params.get("expanded")).toBe("true");
});

test("restores scenario controls on browser back and forward", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();

  const scenarioBack = "?state=ny&fi=2&ni=2&category=all&balance=2000000&expanded=true";
  const scenarioForward = "?state=tx&fi=4&ni=0&category=all&balance=3000000&expanded=false";
  await page.evaluate(({ scenarioBack, scenarioForward }) => {
    window.history.pushState({}, "", scenarioBack);
    window.history.pushState({}, "", scenarioForward);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, { scenarioBack, scenarioForward });

  await expect(page.getByRole("combobox", { name: "Resident state" })).toHaveValue("tx");
  await expect(page.getByRole("slider", { name: "Federal marginal tax bracket" })).toHaveValue("4");
  await expect(page.getByRole("slider", { name: "TX marginal tax bracket" })).toHaveValue("0");
  await expect(page.getByRole("spinbutton", { name: "Annual balance" })).toHaveValue("3000000");
  await expect(page.getByRole("button", { name: "All funds" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Show all 40 funds/ })).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("region", { name: "Winner by federal and TX tax bracket" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("combobox", { name: "Resident state" })).toHaveValue("ny");
  await expect(page.getByRole("slider", { name: "Federal marginal tax bracket" })).toHaveValue("2");
  await expect(page.getByRole("slider", { name: "NY marginal tax bracket" })).toHaveValue("2");
  await expect(page.getByRole("spinbutton", { name: "Annual balance" })).toHaveValue("2000000");
  await expect(page.getByRole("button", { name: "Show only the top initial funds" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("region", { name: "Winner by federal and NY tax bracket" })).toBeVisible();

  await page.goForward();
  await expect(page.getByRole("combobox", { name: "Resident state" })).toHaveValue("tx");
  await expect(page.getByRole("slider", { name: "Federal marginal tax bracket" })).toHaveValue("4");
  await expect(page.getByRole("spinbutton", { name: "Annual balance" })).toHaveValue("3000000");
  expect(new URL(page.url()).searchParams.get("expanded")).toBe("false");
});

test("shows safe Fidelity links, calculation inputs, and balance updates", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: /Show all 40 funds/ }).click();

  const sourceLink = page.getByRole("link", { name: "FSKXX Fidelity fund details (opens in new tab)" });
  await expect(sourceLink).toHaveAttribute("target", "_blank");
  await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(sourceLink).toHaveAttribute("href", /https:\/\/institutional\.fidelity\.com\/app\/fund\/sasid\/details\//);

  const annualValue = page.getByText("Annual value", { exact: true }).locator("..");
  const originalAnnualValue = await annualValue.innerText();
  const balance = page.getByRole("spinbutton", { name: "Annual balance" });
  await balance.fill("1000000");
  await expect(annualValue).not.toHaveText(originalAnnualValue);

  const details = page.locator("details");
  const summary = details.locator("summary");
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details).toContainText("Gross 7-day yield");
  await expect(details).toContainText("Federal rate");
  await expect(details).toContainText("State rate");
  await expect(details).toContainText("Exemption percentage");
  await expect(details).toContainText("Bracket inputs year");
  await expect(details).toContainText("Allocation/exemption data year");
  await expect(details).toContainText("2026");
  await expect(details).toContainText("2025");
  await expect(details).toContainText("Resulting after-tax yield");

  await expect.poll(() => new URL(page.url()).searchParams.get("balance")).toBe("1000000");
});

test("keeps narrow pages within the viewport and supports keyboard expansion", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /All 40 Fidelity Money Market Funds/ })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.viewportWidth);

  const toggle = page.locator('button[aria-controls="fund-list"]');
  await expect(toggle).toHaveAccessibleName(/Show all 40 funds/);
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#fund-list > div")).toHaveCount(40);
});

test("shows the data error screen when a data request fails", async ({ page }) => {
  await page.route("**/fidelity-mm/data/fidelity-mm-allclass.json", (route) => route.abort("failed"));

  await page.goto("./");

  await expect(page.getByRole("heading", { name: "Fidelity data is temporarily unavailable" })).toBeVisible();
  await expect(page.getByText("The page could not load its generated fund data.")).toBeVisible();
});

test("shows the data error screen when a fetched document is malformed", async ({ page }) => {
  await page.route("**/fidelity-mm/data/fidelity-mm-minimums.json", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ invalid: true }),
    }),
  );

  await page.goto("./");

  await expect(page.getByRole("heading", { name: "Fidelity data is temporarily unavailable" })).toBeVisible();
});

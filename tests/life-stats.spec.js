// E2E: Life Stats dashboard, menu integration, demo seed, logging, TAX, exports
// Run: npx playwright test tests/life-stats.spec.js
import { test, expect } from "@playwright/test";

test.describe("Life Stats dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/life-stats.html");
    // start clean
    await page.evaluate(() => localStorage.removeItem("mathmaster_life_stats_v1"));
    await page.reload();
  });

  test("board boots with ten range tabs and all action buttons", async ({ page }) => {
    await expect(page.locator("#ls-tabs .ls-tab")).toHaveCount(10);
    await expect(page.locator("#ls-add")).toBeVisible();
    await expect(page.locator("#ls-demo")).toBeVisible();
    await expect(page.locator("#ls-export-json")).toBeVisible();
    await expect(page.locator("#ls-export-csv")).toBeVisible();
    await expect(page.locator("#ls-export-svg")).toBeVisible();
    await expect(page.locator("#ls-export-png")).toBeVisible();
  });

  test("loading demo data renders charts for every range", async ({ page }) => {
    await page.click("#ls-demo");
    for (const label of ["1 Day", "1 Week", "1 Month", "4 Months", "6 Months", "8 Months", "12 Months", "48 Months", "96 Months", "212 Months"]) {
      await page.click(`#ls-tabs .ls-tab:has-text("${label}")`);
      await expect(page.locator("#ls-charts svg.ls-chart")).toHaveCount(3);
    }
    await expect(page.locator("#ls-cards .ls-card")).toHaveCount(6);
  });

  test("adding an entry updates the stat card and charts", async ({ page }) => {
    await page.click("#ls-demo");
    const before = await page.locator("#ls-cards .ls-card").count();
    await page.click("#ls-add");
    await page.selectOption("#ls-field", "income");
    await page.fill("#ls-value", "12345");
    await page.fill("#ls-note", "bonus");
    await page.click('#ls-form button[type="submit"]');
    await expect(page.locator("#ls-modal")).toBeHidden();
    const after = await page.locator("#ls-cards .ls-card").count();
    expect(after).toBe(before);
    // a line chart should be present
    await expect(page.locator("#ls-charts svg.ls-chart-line")).toBeVisible();
  });

  test("invalid (non-numeric) entry is rejected, no entry saved", async ({ page }) => {
    await page.click("#ls-demo");
    const before = await page.evaluate(() => window.LifeStatsStorage.getStore().entries.length);
    await page.click("#ls-add");
    await page.selectOption("#ls-field", "income");
    // type=number rejects alphabetic input; set an invalid value directly and submit
    await page.locator("#ls-value").evaluate((el) => { el.value = "not-a-number"; });
    await page.click('#ls-form button[type="submit"]');
    // native + app validation must reject: modal stays open, no entry added
    await expect(page.locator("#ls-modal")).toBeVisible();
    const after = await page.evaluate(() => window.LifeStatsStorage.getStore().entries.length);
    expect(after).toBe(before);
  });

  test("custom field can be created via the form", async ({ page }) => {
    await page.click("#ls-demo");
    await page.click("#ls-add");
    await page.selectOption("#ls-field", "__new");
    await expect(page.locator("#ls-custom-wrap")).toBeVisible();
    await page.fill("#ls-custom-name", "Savings");
    await page.fill("#ls-value", "500");
    await page.click('#ls-form button[type="submit"]');
    await expect(page.locator("#ls-cards .ls-card:has-text('Savings')")).toBeVisible();
  });

  test("TAX indicator is present and red; Yes acknowledges and dims badge", async ({ page }) => {
    const badge = page.locator("#tax-indicator");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveCSS("background-color", "rgb(255, 59, 59)");
    await badge.click();
    await expect(page.locator("#tax-modal")).toBeVisible();
    await expect(page.locator("#tax-yesno .yes")).toBeVisible();
    await page.click("#tax-yesno .yes");
    await expect(page.locator("#tax-body")).toBeVisible();
    await page.click("#tax-submit");
    await expect(page.locator("#tax-modal")).toBeHidden();
    await expect(badge).toHaveClass(/acknowledged/);
    // persists across reload
    await page.reload();
    await expect(page.locator("#tax-indicator.acknowledged")).toBeVisible();
  });

  test("JSON and CSV exports trigger downloads", async ({ page }) => {
    await page.click("#ls-demo");
    const dl = page.waitForEvent("download");
    await page.click("#ls-export-json");
    const jsonDl = await dl;
    expect(jsonDl.suggestedFilename()).toMatch(/\.json$/);

    const dl2 = page.waitForEvent("download");
    await page.click("#ls-export-csv");
    const csvDl = await dl2;
    expect(csvDl.suggestedFilename()).toMatch(/\.csv$/);
  });

  test("PNG export produces a .png download", async ({ page }) => {
    await page.click("#ls-demo");
    const dl = page.waitForEvent("download");
    await page.click("#ls-export-png");
    const pngDl = await dl;
    expect(pngDl.suggestedFilename()).toMatch(/\.png$/);
  });

  test("user-controlled field labels are HTML-escaped (no stored XSS)", async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem("mathmaster_life_stats_v1"));
  await page.goto("/src/pages/life-stats.html");
  await page.evaluate(() => localStorage.removeItem("mathmaster_life_stats_v1"));
  await page.reload();

  // Seed a custom field whose LABEL is an injection payload (label is user-controlled).
  const xssLabel = '<img src=x onerror="window.__xssFired=true">';
  await page.click("#ls-add");
  await page.selectOption("#ls-field", "__new");
  await page.fill("#ls-custom-name", xssLabel);
  await page.fill("#ls-value", "1");
  await page.click('#ls-form button[type="submit"]');

  // The injected label must appear as literal escaped text, never as a parsed element.
  const cardsHtml = await page.locator("#ls-cards").innerHTML();
  expect(cardsHtml).toContain("&lt;img src=x onerror");
  expect(cardsHtml).not.toContain("<img src=x onerror");
  // No <img> may have been parsed inside any card heading.
  const liveImg = page.locator("#ls-cards .ls-card h3 img");
  await expect(liveImg).toHaveCount(0);
  // Confirm no script/injection executed.
  const fired = await page.evaluate(() => window.__xssFired === true);
  expect(fired).toBe(false);

  // Legend toggle button must also escape the label (no live <img>).
  const legendHtml = await page.locator("#ls-charts .ls-legend").innerHTML();
  expect(legendHtml).toContain("&lt;img src=x onerror");
  expect(legendHtml).not.toContain("<img src=x onerror");
  await expect(page.locator("#ls-charts .ls-legend button img")).toHaveCount(0);
});

test("prefers-reduced-motion disables the TAX pulse", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/src/pages/life-stats.html");
    await expect(page.locator("#tax-indicator")).toBeVisible();
    const anim = await page.locator("#tax-indicator").evaluate((el) => getComputedStyle(el).animationName);
    expect(anim).toBe("none");
  });
});

test.describe("Life Stats menu integration", () => {
  test("index page has a Life Stats button that opens the board", async ({ page }) => {
    await page.goto("/src/pages/index.html");
    const btn = page.locator("#life-stats-menu-button");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", "/src/pages/life-stats.html");
  });

  test("feature panel stays hidden when no data, shows sparklines after demo load", async ({ page }) => {
    await page.goto("/src/pages/life-stats.html");
    await page.evaluate(() => localStorage.removeItem("mathmaster_life_stats_v1"));
    await page.click("#ls-demo");
    // menu reads from same storage; go to index and check panel
    await page.goto("/src/pages/index.html");
    await expect(page.locator("#life-stats-features")).toBeVisible();
    await expect(page.locator("#life-stats-features .ls-feature svg")).toHaveCount(4);
  });
});

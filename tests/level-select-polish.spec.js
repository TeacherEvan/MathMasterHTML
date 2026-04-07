// @ts-check
import { expect, test } from "@playwright/test";

/**
 * @param {import("@playwright/test").Page} page
 */
async function waitForCardsToSettle(page) {
  await expect(page.locator(".level-card")).toHaveCount(3);
}

/**
 * @template T
 * @param {T | null} value
 * @returns {T}
 */
function expectDefined(value) {
  expect(value).toBeTruthy();
  return /** @type {T} */ (value);
}

/**
 * @param {{ x: number; y: number; width: number; height: number }} cardBox
 * @param {{ x: number; y: number; width: number; height: number }} buttonBox
 */
function expectButtonWithinCard(cardBox, buttonBox) {
  expect(buttonBox.width).toBeGreaterThanOrEqual(120);
  expect(buttonBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
  expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(
    cardBox.x + cardBox.width + 1,
  );
  expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(
    cardBox.y + cardBox.height + 1,
  );
}

test.describe("Level select polish", () => {
  test("keeps the hero and route cards visually readable after polish", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    const header = page.locator(".header");
    const headerHint = page.locator(".header-hint");
    const headerSubtitle = page.locator(".level-select-subtitle");
    const levelsGrid = page.locator(".levels-grid");
    const beginnerCard = page.locator('.level-card[data-level="beginner"]');
    const warriorCard = page.locator('.level-card[data-level="warrior"]');
    const masterCard = page.locator('.level-card[data-level="master"]');

    await expect(page).toHaveTitle("Math Master — Level Select");
    await expect(header.locator(".page-kicker")).toHaveText("Training dossier");
    await expect(header.locator(".main-title")).toHaveText("MATH MASTER");
    await expect(header.locator(".subtitle")).toHaveText("Choose a route");
    await expect(headerSubtitle).toContainText("Three tracks. One keyboard.");

    await waitForCardsToSettle(page);

    const [
      headerBox,
      headerHintBox,
      levelsGridBox,
      beginnerBox,
      warriorBox,
      masterBox,
    ] = await Promise.all([
      header.boundingBox(),
      headerHint.boundingBox(),
      levelsGrid.boundingBox(),
      beginnerCard.boundingBox(),
      warriorCard.boundingBox(),
      masterCard.boundingBox(),
    ]);

    const resolvedHeaderBox = expectDefined(headerBox);
    const resolvedHeaderHintBox = expectDefined(headerHintBox);
    const resolvedLevelsGridBox = expectDefined(levelsGridBox);
    const resolvedBeginnerBox = expectDefined(beginnerBox);
    const resolvedWarriorBox = expectDefined(warriorBox);
    const resolvedMasterBox = expectDefined(masterBox);

    expect(resolvedHeaderHintBox.width).toBeLessThanOrEqual(
      resolvedHeaderBox.width,
    );
    expect(resolvedBeginnerBox.y).toBeGreaterThanOrEqual(
      resolvedLevelsGridBox.y - 4,
    );
    expect(
      Math.abs(resolvedWarriorBox.y - resolvedBeginnerBox.y),
    ).toBeLessThanOrEqual(32);
    expect(
      Math.abs(resolvedMasterBox.y - resolvedBeginnerBox.y),
    ).toBeLessThanOrEqual(32);
    expect(
      Math.abs(resolvedBeginnerBox.height - resolvedWarriorBox.height),
    ).toBeLessThanOrEqual(72);
    expect(
      Math.abs(resolvedMasterBox.height - resolvedWarriorBox.height),
    ).toBeLessThanOrEqual(72);
  });

  test("uses a compact route selector instead of stacked scrolling cards on narrow mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    await waitForCardsToSettle(page);

    const switcher = page.locator(".route-switcher");
    const switcherButtons = switcher.locator(".route-switcher-button");
    const activeCard = page.locator('.level-card:not([hidden])');
    const activeButton = activeCard.locator(".level-button");

    await expect(switcher).toBeVisible();
    await expect(switcherButtons).toHaveCount(3);
    await expect(activeCard).toHaveCount(1);

    const [docHeight, viewportHeight, activeCardBox, activeButtonBox] =
      await Promise.all([
        page.evaluate(() => document.documentElement.scrollHeight),
        page.evaluate(() => window.innerHeight),
        activeCard.boundingBox(),
        activeButton.boundingBox(),
      ]);

    const resolvedActiveCardBox = expectDefined(activeCardBox);
    const resolvedActiveButtonBox = expectDefined(activeButtonBox);

    expect(docHeight - viewportHeight).toBeLessThanOrEqual(180);
    expectButtonWithinCard(resolvedActiveCardBox, resolvedActiveButtonBox);
  });

  test("switches the visible route panel when a compact selector button is pressed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    await waitForCardsToSettle(page);

    await page
      .locator('.route-switcher-button[data-level="warrior"]')
      .dispatchEvent("pointerdown");

    await expect(
      page.locator('.route-switcher-button[data-level="warrior"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.level-card[data-level="warrior"]')).toBeVisible();
    await expect(page.locator('.level-card[data-level="beginner"]')).toBeHidden();
  });
});

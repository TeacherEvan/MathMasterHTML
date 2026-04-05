// @ts-check
import { expect, test } from "@playwright/test";

/**
 * @param {import("@playwright/test").Page} page
 */
async function waitForCardsToSettle(page) {
  await page.waitForFunction(() => {
    const cards = Array.from(document.querySelectorAll(".level-card"));
    if (cards.length !== 3) return false;

    return cards.every((card) => {
      const style = window.getComputedStyle(card);
      const opacity = Number.parseFloat(style.opacity || "1");
      const transform = style.transform;

      return (
        opacity >= 0.99 &&
        (transform === "none" ||
          /^matrix\(1, 0, 0, 1, 0(?:\.0+)?, 0(?:\.0+)?\)$/.test(transform))
      );
    });
  });
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

  test("stacks cleanly and preserves CTA clarity on narrow mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    const header = page.locator(".header");
    const levelsGrid = page.locator(".levels-grid");
    const cards = page.locator(".level-card");
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);
    const cta = firstCard.locator(".level-button");

    const [gridTemplateColumns, firstCardBox, secondCardBox, ctaBox] =
      await Promise.all([
        levelsGrid.evaluate(
          (element) => window.getComputedStyle(element).gridTemplateColumns,
        ),
        firstCard.boundingBox(),
        secondCard.boundingBox(),
        cta.boundingBox(),
      ]);

    const resolvedFirstCardBox = expectDefined(firstCardBox);
    const resolvedSecondCardBox = expectDefined(secondCardBox);
    const resolvedCtaBox = expectDefined(ctaBox);

    expect(gridTemplateColumns).not.toContain(" ");
    expect(resolvedSecondCardBox.y).toBeGreaterThanOrEqual(
      resolvedFirstCardBox.y + resolvedFirstCardBox.height - 2,
    );
    expect(resolvedCtaBox.width).toBeGreaterThanOrEqual(120);
    expect(resolvedCtaBox.x).toBeGreaterThanOrEqual(resolvedFirstCardBox.x - 1);
    expect(resolvedCtaBox.x + resolvedCtaBox.width).toBeLessThanOrEqual(
      resolvedFirstCardBox.x + resolvedFirstCardBox.width + 1,
    );
  });
});

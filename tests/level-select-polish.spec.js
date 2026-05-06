// @ts-check
import { expect, test } from "@playwright/test";

const PROFILE_KEY = "mathmaster_player_profile_v1";

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

      const transformSettled = (() => {
        if (transform === "none") return true;

        const match = transform.match(/^matrix\((.+)\)$/);
        if (!match) return false;

        const values = match[1].split(",").map((value) => Number.parseFloat(value.trim()));
        if (values.length !== 6) return false;

        const [scaleX, skewY, skewX, scaleY, translateX, translateY] = values;
        return (
          Math.abs(scaleX - 1) <= 0.01 &&
          Math.abs(skewY) <= 0.01 &&
          Math.abs(skewX) <= 0.01 &&
          Math.abs(scaleY - 1) <= 0.01 &&
          Math.abs(translateX) <= 0.5 &&
          Math.abs(translateY) <= 6
        );
      })();

      return opacity >= 0.99 && transformSettled;
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

/**
 * @param {import("@playwright/test").Page} page
 */
async function readRouteDeckState(page) {
  return page.evaluate(() => {
    const isShown = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.hidden) return false;

      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    };

    const switcherButtons = Array.from(
      document.querySelectorAll(".route-switcher-button"),
    ).map((button) => ({
      level: button.getAttribute("data-level"),
      label: button.textContent?.replace(/\s+/g, " ").trim() || "",
      pressed: button.getAttribute("aria-pressed"),
      isActive: button.classList.contains("is-active"),
    }));

    const cards = Array.from(document.querySelectorAll(".level-card")).map((card) => {
      const progress = card.querySelector(".progress-container");
      const caption = card.querySelector(".level-cta-caption");
      const button = card.querySelector(".level-button");
      const title = card.querySelector(".level-title");
      const brief = card.querySelector(".level-brief");
      const style = window.getComputedStyle(card);

      return {
        level: card.getAttribute("data-level"),
        title: title?.textContent?.trim() || "",
        brief: brief?.textContent?.trim() || "",
        buttonLabel: button?.textContent?.trim() || "",
        hidden: card.hidden,
        isActive: card.classList.contains("is-active"),
        opacity: Number.parseFloat(style.opacity || "1"),
        progressVisible: isShown(progress),
        captionVisible: isShown(caption),
        buttonVisible: isShown(button),
      };
    });

    return {
      switcherButtons,
      cards,
      atlasCopy: Array.from(document.querySelectorAll(".route-atlas-copy")).map((item) =>
        item.textContent?.trim() || "",
      ),
    };
  });
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
    await expect(headerSubtitle).toContainText("Three routes. Saved here.");
    await expect(headerHint).toContainText("Keys 1 / 2 / 3 start");
    await expect(headerHint).toContainText("Saved on device");

    await waitForCardsToSettle(page);

    const routeDeckState = await readRouteDeckState(page);

    expect(routeDeckState.atlasCopy).toEqual([
      "Warm-up",
      "Switch pace",
      "Full strain",
    ]);
    expect(routeDeckState.switcherButtons).toEqual([
      {
        level: "beginner",
        label: "01 Foundations",
        pressed: "true",
        isActive: true,
      },
      {
        level: "warrior",
        label: "02 Mixed Ops",
        pressed: "false",
        isActive: false,
      },
      {
        level: "master",
        label: "03 Division",
        pressed: "false",
        isActive: false,
      },
    ]);
    expect(routeDeckState.cards).toEqual([
      {
        level: "beginner",
        title: "Foundations",
        brief: "Clean starts.",
        buttonLabel: "Run foundations",
        hidden: false,
        isActive: true,
        opacity: routeDeckState.cards[0].opacity,
        progressVisible: true,
        captionVisible: true,
        buttonVisible: true,
      },
      {
        level: "warrior",
        title: "Mixed Ops",
        brief: "Shift fast. Stay clean.",
        buttonLabel: "Run mixed ops",
        hidden: false,
        isActive: false,
        opacity: routeDeckState.cards[1].opacity,
        progressVisible: false,
        captionVisible: false,
        buttonVisible: true,
      },
      {
        level: "master",
        title: "Division",
        brief: "Fast clock. Exact answers.",
        buttonLabel: "Run division",
        hidden: false,
        isActive: false,
        opacity: routeDeckState.cards[2].opacity,
        progressVisible: false,
        captionVisible: false,
        buttonVisible: true,
      },
    ]);
    expect(routeDeckState.cards[0].opacity).toBeGreaterThan(
      routeDeckState.cards[1].opacity,
    );
    expect(routeDeckState.cards[0].opacity).toBeGreaterThan(
      routeDeckState.cards[2].opacity,
    );

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
    expect(resolvedBeginnerBox.height).toBeGreaterThan(resolvedWarriorBox.height);
    expect(resolvedBeginnerBox.height).toBeGreaterThan(resolvedMasterBox.height);
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
    const activeCard = page.locator('.level-card[data-level="beginner"]');
    const activeButton = activeCard.locator(".level-button");

    await expect(switcher).toBeVisible();
    await expect(switcherButtons).toHaveCount(3);
    await expect(switcherButtons.nth(0)).toContainText("Foundations");
    await expect(switcherButtons.nth(1)).toContainText("Mixed Ops");
    await expect(switcherButtons.nth(2)).toContainText("Division");
    await expect(switcherButtons.nth(0)).toHaveAttribute("aria-pressed", "true");
    await expect(switcherButtons.nth(1)).toHaveAttribute("aria-pressed", "false");
    await expect(switcherButtons.nth(2)).toHaveAttribute("aria-pressed", "false");

    const [visibleLevels, docHeight, viewportHeight, activeCardBox, activeButtonBox] =
      await Promise.all([
        page.evaluate(() =>
          Array.from(document.querySelectorAll(".level-card"))
            .filter((card) => !card.hidden)
            .map((card) => card.dataset.level),
        ),
        page.evaluate(() => document.documentElement.scrollHeight),
        page.evaluate(() => window.innerHeight),
        activeCard.boundingBox(),
        activeButton.boundingBox(),
      ]);

    expect(visibleLevels).toEqual(["beginner"]);
    expect(docHeight - viewportHeight).toBeLessThanOrEqual(180);

    const resolvedActiveCardBox = expectDefined(activeCardBox);
    const resolvedActiveButtonBox = expectDefined(activeButtonBox);
    expectButtonWithinCard(resolvedActiveCardBox, resolvedActiveButtonBox);
  });

  test("keeps one unmistakable launch CTA on narrow mobile", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      if (!sessionStorage.getItem("level-select-mobile-seeded")) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            version: 3,
            name: "Player",
            levels: {
              beginner: {
                totalScore: 43210,
                bestProblemScore: 12345,
                lastProblemScore: 9000,
                problemsCompleted: 7,
                lastPlayed: Date.now(),
              },
            },
            overall: {
              totalScore: 43210,
              problemsCompleted: 7,
              lastPlayed: Date.now(),
            },
            recentHistory: [
              {
                levelKey: "beginner",
                score: 12345,
                completedAt: Date.now(),
              },
            ],
            updatedAt: Date.now(),
          }),
        );
        localStorage.setItem("mathmaster_problems_beginner", "7");
        sessionStorage.setItem("level-select-mobile-seeded", "1");
      }
    }, PROFILE_KEY);

    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    await waitForCardsToSettle(page);

    const activeCard = page.locator('.level-card[data-level="beginner"]');
    const cta = activeCard.locator(".level-button");
    const ctaHint = activeCard.locator(".level-cta-caption");

    await expect(cta).toBeVisible();
    await expect(ctaHint).toBeVisible();
    await expect(cta).toHaveText("Run foundations");
    await expect(ctaHint).toHaveText("Best first pick.");

    const injectedStats = activeCard.locator(
      ".completion-stat, .best-score-stat, .total-score-stat",
    );
    await expect(injectedStats).toHaveCount(3);

    const { visibleNoiseCount, visibleCtas, statValueFontSize, progressLabelFontSize } = await page.evaluate(() => {
      const isShown = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        if (element.hidden || element.closest("[hidden]")) return false;

        const style = window.getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      };

      return {
        visibleNoiseCount: Array.from(
          document.querySelectorAll(
            ".best-score-stat, .total-score-stat, .stat[data-mobile-priority='low']",
          ),
        ).filter(isShown).length,
        visibleCtas: Array.from(document.querySelectorAll(".level-button"))
          .filter(isShown)
          .map((button) => button.textContent?.trim() || ""),
        statValueFontSize: Number.parseFloat(
          window.getComputedStyle(
            document.querySelector(
              '.level-card[data-level="beginner"] .completion-stat .stat-value',
            ),
          ).fontSize,
        ),
        progressLabelFontSize: Number.parseFloat(
          window.getComputedStyle(
            document.querySelector(
              '.level-card[data-level="beginner"] .progress-label',
            ),
          ).fontSize,
        ),
      };
    });

    expect(visibleNoiseCount).toBe(0);
    expect(visibleCtas).toEqual(["Run foundations"]);
    expect(statValueFontSize).toBeGreaterThanOrEqual(16);
    expect(progressLabelFontSize).toBeGreaterThanOrEqual(10);

    const [activeCardBox, ctaBox] = await Promise.all([
      activeCard.boundingBox(),
      cta.boundingBox(),
    ]);

    const resolvedActiveCardBox = expectDefined(activeCardBox);
    const resolvedCtaBox = expectDefined(ctaBox);

    expect(resolvedActiveCardBox.y).toBeGreaterThanOrEqual(0);
    expect(resolvedCtaBox.y + resolvedCtaBox.height).toBeLessThanOrEqual(915);
    expect(resolvedCtaBox.height).toBeGreaterThanOrEqual(48);
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
      .click();

    await expect(
      page.locator('.route-switcher-button[data-level="warrior"]'),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('.level-card[data-level="warrior"] .level-button'),
    ).toHaveText("Run mixed ops");

    const visibleLevels = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".level-card"))
        .filter((card) => !card.hidden)
        .map((card) => card.dataset.level),
    );

    expect(visibleLevels).toEqual(["warrior"]);
  });

  test("switches the visible route panel when a compact selector button is activated from the keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 430, height: 932 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    await waitForCardsToSettle(page);

    const warriorButton = page.locator(
      '.route-switcher-button[data-level="warrior"]',
    );
    const masterButton = page.locator(
      '.route-switcher-button[data-level="master"]',
    );

    await warriorButton.focus();
    await page.keyboard.press("Enter");
    await expect(warriorButton).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('.level-card[data-level="warrior"]'),
    ).toBeVisible();

    await masterButton.focus();
    await page.keyboard.press("Space");
    await expect(masterButton).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator('.level-card[data-level="master"]'),
    ).toBeVisible();
    await expect(
      page.locator('.level-card[data-level="master"] .level-button'),
    ).toHaveText("Run division");
  });

  test("exposes semantic landmarks and hides decorative symbols from assistive tech", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/src/pages/level-select.html", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("header.header")).toBeVisible();
    await expect(page.locator("main.level-container")).toBeVisible();
    await expect(page.locator("footer.navigation")).toBeVisible();

    const decorativeState = await page.evaluate(() => {
      const matrix = document.getElementById("matrixBg");
      const symbols = Array.from(document.querySelectorAll(".math-symbol"));
      return {
        matrixHidden: matrix?.getAttribute("aria-hidden"),
        symbolStates: symbols.map((element) => element.getAttribute("aria-hidden")),
      };
    });

    expect(decorativeState.matrixHidden).toBe("true");
    expect(decorativeState.symbolStates.length).toBeGreaterThan(0);
    expect(decorativeState.symbolStates.every((value) => value === "true")).toBe(true);
  });
});

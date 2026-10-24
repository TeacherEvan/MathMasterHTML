import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
  stopEvanHelpIfActive,
} from "./utils/onboarding-runtime.js";

test.setTimeout(120000);

const VIEWPORTS = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "tablet-1180x820", width: 1180, height: 820 },
  { name: "phone-landscape-844x390", width: 844, height: 390 },
  { name: "phone-landscape-740x360", width: 740, height: 360 },
];

const MIN_VISIBLE_SYMBOLS = 6;
const OVERLAP_TOLERANCE_PX = 1;

async function bootGameplay(page) {
  await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
  await dismissBriefingAndWaitForInteractiveGameplay(page);
  await stopEvanHelpIfActive(page);
  await page.waitForFunction(
    () => window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
    undefined,
    { timeout: 20000 },
  );
}

async function waitForVisibleSymbols(page, minimum = MIN_VISIBLE_SYMBOLS) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            document.querySelectorAll(
              '#symbol-rain-container .falling-symbol[data-symbol-state="visible"]',
            ).length,
        ),
      { timeout: 20000 },
    )
    .toBeGreaterThanOrEqual(minimum);
}

/**
 * Reads the live geometry of every visible rain symbol.
 * Each entry carries the element box (the 44x44 tap target) and whether its
 * centre still hit-tests to itself.
 */
async function readSymbolGeometry(page) {
  return page.evaluate(() => {
    const container = document.getElementById("symbol-rain-container");
    const consoleZone = document.querySelector("#panel-c .panel-c-console-zone");
    const nodes = Array.from(
      container?.querySelectorAll(
        '.falling-symbol[data-symbol-state="visible"]',
      ) || [],
    );

    const round = (value) => Number(value.toFixed(2));
    const toRect = (rect) => ({
      left: round(rect.left),
      top: round(rect.top),
      right: round(rect.right),
      bottom: round(rect.bottom),
      width: round(rect.width),
      height: round(rect.height),
    });

    const symbols = nodes.map((element) => {
      const rect = element.getBoundingClientRect();
      const centreX = rect.left + rect.width / 2;
      const centreY = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(centreX, centreY);

      return {
        text: element.textContent,
        rect: toRect(rect),
        hitSelf: hit === element || element.contains(hit),
        hitTarget:
          hit?.id ||
          (typeof hit?.className === "string" ? hit.className : hit?.tagName) ||
          null,
      };
    });

    return {
      container: container ? toRect(container.getBoundingClientRect()) : null,
      consoleZone: consoleZone
        ? toRect(consoleZone.getBoundingClientRect())
        : null,
      symbols,
      slotCount: window.__symbolRainState?.layout?.slotCount ?? null,
    };
  });
}

function findOverlaps(rects) {
  const overlaps = [];

  for (let first = 0; first < rects.length; first += 1) {
    for (let second = first + 1; second < rects.length; second += 1) {
      const a = rects[first];
      const b = rects[second];
      const overlapX =
        Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY =
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

      if (
        overlapX > OVERLAP_TOLERANCE_PX &&
        overlapY > OVERLAP_TOLERANCE_PX
      ) {
        overlaps.push({
          a: `${first}:${a.text}`,
          b: `${second}:${b.text}`,
          overlapX: Number(overlapX.toFixed(1)),
          overlapY: Number(overlapY.toFixed(1)),
        });
      }
    }
  }

  return overlaps;
}

test.describe("Gameplay entity obstruction", () => {
  test("rain symbols never overlap each other or the console band", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Viewport matrix runs on the desktop Chromium project.",
    );

    for (const viewport of VIEWPORTS) {
      await test.step(viewport.name, async () => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(
          `/src/pages/game.html?level=beginner&evan=off&preload=off&case=${viewport.name}-${Date.now()}`,
          { waitUntil: "domcontentloaded" },
        );
        await bootGameplay(page);
        await waitForVisibleSymbols(page);

        const geometry = await readSymbolGeometry(page);
        expect(geometry.symbols.length).toBeGreaterThanOrEqual(
          MIN_VISIBLE_SYMBOLS,
        );

        // 1. No two visible symbols share space.
        expect(findOverlaps(geometry.symbols.map((s) => s.rect))).toEqual([]);

        // 2. Every symbol is actually reachable by a tap at its centre.
        const blocked = geometry.symbols.filter((symbol) => !symbol.hitSelf);
        expect(
          blocked.map((symbol) => ({
            text: symbol.text,
            hitTarget: symbol.hitTarget,
            rect: symbol.rect,
          })),
        ).toEqual([]);

        // 3. Nothing is painted outside the rain window.
        const outside = geometry.symbols.filter(
          (symbol) =>
            symbol.rect.left < geometry.container.left - 1 ||
            symbol.rect.top < geometry.container.top - 1 ||
            symbol.rect.right > geometry.container.right + 1 ||
            symbol.rect.bottom > geometry.container.bottom + 1,
        );
        expect(outside).toEqual([]);

        // 4. No target is parked behind the console band: the placement grid
        //    reserves the chrome even though the DOM container still spans it.
        if (geometry.consoleZone && geometry.symbols.length > 0) {
          const lowestSymbolBottom = Math.max(
            ...geometry.symbols.map((symbol) => symbol.rect.bottom),
          );
          expect(lowestSymbolBottom).toBeLessThanOrEqual(
            geometry.consoleZone.top - 1,
          );
        }
      });
    }
  });

  test("touch gameplay keeps 44px targets that do not swallow each other", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["iphone-13", "pixel-7"].includes(testInfo.project.name),
      "Touch target contract runs on the mobile projects.",
    );

    const viewport = page.viewportSize();
    if (viewport && viewport.width < viewport.height) {
      await page.setViewportSize({
        width: viewport.height,
        height: viewport.width,
      });
    }

    await page.goto(
      `/src/pages/game.html?level=beginner&evan=off&preload=off&case=touch-${Date.now()}`,
      { waitUntil: "domcontentloaded" },
    );
    await bootGameplay(page);
    await waitForVisibleSymbols(page);

    const geometry = await readSymbolGeometry(page);

    for (const symbol of geometry.symbols) {
      expect(symbol.rect.width, `symbol ${symbol.text} width`).toBeGreaterThanOrEqual(44);
      expect(symbol.rect.height, `symbol ${symbol.text} height`).toBeGreaterThanOrEqual(44);
    }

    expect(findOverlaps(geometry.symbols.map((s) => s.rect))).toEqual([]);
    expect(geometry.symbols.filter((symbol) => !symbol.hitSelf)).toEqual([]);
  });

  test("the field never blanks and never exceeds its slot capacity", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Continuity contract runs on the desktop Chromium project.",
    );

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      `/src/pages/game.html?level=beginner&evan=off&preload=off&case=continuity-${Date.now()}`,
      { waitUntil: "domcontentloaded" },
    );
    await bootGameplay(page);
    await waitForVisibleSymbols(page, 4);

    const readSample = () =>
      page.evaluate(() => {
        const state = window.__symbolRainState;
        return {
          visible: document.querySelectorAll(
            '#symbol-rain-container .falling-symbol[data-symbol-state="visible"]',
          ).length,
          total: document.querySelectorAll("#symbol-rain-container .falling-symbol")
            .length,
          slotCount: state?.layout?.slotCount ?? null,
        };
      });

    // The opening roster is the exact window where the old code showed every
    // symbol at once (85 visible in a 24-slot field). Sample it immediately.
    const openingSamples = [];
    for (let index = 0; index < 10; index += 1) {
      openingSamples.push(await readSample());
      await page.waitForTimeout(200);
    }

    // Compress the lifecycle so the 20 s run covers many visible/hidden cycles
    // instead of one. The original defect (a fully blank field for ~2 s at the
    // end of the first cycle) only surfaced after ~8 s, so a short happy-path
    // sample would have missed it.
    await page.evaluate(() => {
      const config = window.__symbolRainState?.config;
      if (!config) return;
      config.visibleMs = 400;
      config.fadeMs = 100;
      config.hiddenMinMs = 250;
      config.hiddenMaxMs = 500;
    });

    // Let the symbols that were scheduled under the old window finish hiding,
    // then observe the compressed regime across many full cycles.
    await page.waitForTimeout(8000);

    const cycleSamples = [];
    for (let index = 0; index < 48; index += 1) {
      cycleSamples.push(await readSample());
      await page.waitForTimeout(250);
    }

    const samples = [...openingSamples, ...cycleSamples];
    const counts = samples.map((sample) => sample.visible);
    const slotCount = samples.at(-1)?.slotCount ?? null;

    expect(Math.min(...counts), "field went blank").toBeGreaterThan(0);

    if (Number.isInteger(slotCount)) {
      expect(
        Math.max(...counts),
        "more visible symbols than the grid can hold without overlap",
      ).toBeLessThanOrEqual(slotCount);
      // A grid that never fills means the backpressure path is dead and the
      // field is silently starving.
      expect(Math.max(...counts), "grid never filled").toBeGreaterThan(1);
    }
  });
});

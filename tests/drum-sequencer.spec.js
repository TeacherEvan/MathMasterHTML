/**
 * tests/drum-sequencer.spec.js - Playwright coverage for drum sequencer
 */
import { expect, test } from "@playwright/test";

test.describe("DrumSequencer", () => {
  test("should expose startDrumSequencer and stopDrumSequencer", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    const methods = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      return {
        hasStart: typeof audio?.startDrumSequencer === "function",
        hasStop: typeof audio?.stopDrumSequencer === "function",
      };
    });
    expect(methods.hasStart).toBe(true);
    expect(methods.hasStop).toBe(true);
  });

  test("should initialize drum complexity at zero", async ({ page }) => {
    await page.goto("/game.html?level=beginner");
    const level = await page.evaluate(() => {
      return window.CyberpunkInteractionAudio?._drumComplexity ?? -1;
    });
    expect(level).toBe(0);
  });

  test("should increment complexity on problemLineCompleted", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return { skipped: true };
      const before = audio._drumComplexity;
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", {
          detail: { lineNumber: 1, totalLines: 4, isLastStep: false },
        }),
      );
      return {
        before,
        after: audio._drumComplexity,
      };
    });
    if (result.skipped) return;
    expect(result.after).toBe(result.before + 1);
  });

  test("should cap complexity at the configured maximum", async ({ page }) => {
    await page.goto("/game.html?level=beginner");
    const capped = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return { skipped: true };
      for (let i = 0; i < 20; i += 1) {
        document.dispatchEvent(
          new CustomEvent("problemLineCompleted", {
            detail: { lineNumber: i + 1, totalLines: 20, isLastStep: false },
          }),
        );
      }
      return {
        complexity: audio._drumComplexity,
        max: audio._drumMaxComplexity,
      };
    });
    if (capped.skipped) return;
    expect(capped.complexity).toBeLessThanOrEqual(capped.max);
  });
});

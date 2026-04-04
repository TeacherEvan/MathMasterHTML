/**
 * tests/drum-sequencer.spec.js - Playwright coverage for drum sequencer
 */
import { expect, test } from "@playwright/test";

async function gotoDrumTestPage(page) {
  await page.addInitScript(() => {
    window.__MM_ENABLE_AUDIO_IN_TESTS = true;
  });
  await page.goto("/game.html?level=beginner");
}

test.describe("DrumSequencer", () => {
  test("should expose startDrumSequencer and stopDrumSequencer", async ({
    page,
  }) => {
    await gotoDrumTestPage(page);
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
    await gotoDrumTestPage(page);
    const level = await page.evaluate(() => {
      return window.CyberpunkInteractionAudio?._drumComplexity ?? -1;
    });
    expect(level).toBe(0);
  });

  test("should increment complexity on problemLineCompleted", async ({
    page,
  }) => {
    await gotoDrumTestPage(page);
    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return { hasAudio: false };
      const before = audio._drumComplexity;
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", {
          detail: { lineNumber: 1, totalLines: 4, isLastStep: false },
        }),
      );
      return {
        hasAudio: true,
        disabled: audio.disabled === true,
        before,
        after: audio._drumComplexity,
      };
    });
    expect(result.hasAudio).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.after).toBe(result.before + 1);
  });

  test("should cap complexity at the configured maximum", async ({ page }) => {
    await gotoDrumTestPage(page);
    const capped = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return { hasAudio: false };
      for (let i = 0; i < 20; i += 1) {
        document.dispatchEvent(
          new CustomEvent("problemLineCompleted", {
            detail: { lineNumber: i + 1, totalLines: 20, isLastStep: false },
          }),
        );
      }
      return {
        hasAudio: true,
        disabled: audio.disabled === true,
        complexity: audio._drumComplexity,
        max: audio._drumMaxComplexity,
      };
    });
    expect(capped.hasAudio).toBe(true);
    expect(capped.disabled).toBe(false);
    expect(capped.complexity).toBeLessThanOrEqual(capped.max);
  });
});

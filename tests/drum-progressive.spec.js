/**
 * tests/drum-progressive.spec.js - Integration coverage for progressive drum beats
 */
import { expect, test } from "@playwright/test";

test.describe("Progressive Drum Beat", () => {
  test("drum system initializes and exposes expected methods", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      return {
        hasLoader: typeof audio?.loadDrumSamples === "function",
        hasStart: typeof audio?.startDrumSequencer === "function",
        hasStop: typeof audio?.stopDrumSequencer === "function",
        complexity: audio?._drumComplexity,
      };
    });

    expect(result.hasLoader).toBe(true);
    expect(result.hasStart).toBe(true);
    expect(result.hasStop).toBe(true);
    expect(result.complexity).toBe(0);
  });

  test("complexity ramps across successive line-completion events", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return { skipped: true };

      const complexities = [audio._drumComplexity];
      for (let i = 0; i < 5; i += 1) {
        document.dispatchEvent(
          new CustomEvent("problemLineCompleted", {
            detail: { lineNumber: i + 1, totalLines: 6, isLastStep: false },
          }),
        );
        complexities.push(audio._drumComplexity);
      }
      return { complexities };
    });

    if (result.skipped) return;
    expect(result.complexities).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("mute state reduces drum gain", async ({ page }) => {
    await page.goto("/game.html?level=beginner");
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return { skipped: true };
      audio._ensureContext();
      audio._drumEnsureGain();
      document.dispatchEvent(
        new CustomEvent("cyberpunkAudioStateChanged", {
          detail: { muted: true, available: true, reason: "test" },
        }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      return {
        gainValue: audio._drumGain?.gain?.value ?? -1,
      };
    });

    if (result.skipped) return;
    expect(result.gainValue).toBeLessThan(0.01);
  });
});

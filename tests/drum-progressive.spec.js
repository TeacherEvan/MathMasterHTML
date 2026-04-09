/**
 * tests/drum-progressive.spec.js - Integration coverage for progressive drum beats
 */
import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";
import { getStepSnapshot } from "./utils/perf-scenarios.helpers.js";

async function gotoDrumTestPage(page) {
  await page.addInitScript(() => {
    window.__MM_ENABLE_AUDIO_IN_TESTS = true;
  });
  await page.goto("/game.html?level=beginner");
}

test.describe("Progressive Drum Beat", () => {
  test("drum system initializes and exposes expected methods", async ({
    page,
  }) => {
    await gotoDrumTestPage(page);
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      return {
        hasLoader: typeof audio?.loadDrumSamples === "function",
        hasStart: typeof audio?.startDrumSequencer === "function",
        hasStop: typeof audio?.stopDrumSequencer === "function",
        disabled: audio?.disabled === true,
        complexity: audio?._drumComplexity,
      };
    });

    expect(result.hasLoader).toBe(true);
    expect(result.hasStart).toBe(true);
    expect(result.hasStop).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.complexity).toBe(0);
  });

  test("gameplay runtime advances drum complexity after real line progress", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.__MM_ENABLE_AUDIO_IN_TESTS = true;
    });
    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => Boolean(window.CyberpunkInteractionAudio));

    const before = await page.evaluate(
      () => window.CyberpunkInteractionAudio?._drumComplexity ?? null,
    );
    const stepBefore = await getStepSnapshot(page);

    expect(before).toBe(0);
    expect(stepBefore.stepIndex).not.toBeNull();
    expect(stepBefore.hiddenSymbols.length).toBeGreaterThan(0);

    const helpButton = page.locator("#help-button");
    await expect(helpButton).toBeVisible();

    for (let index = 0; index < stepBefore.hiddenSymbols.length; index += 1) {
      await helpButton.click();
      await page.waitForTimeout(100);
    }

    await page.waitForFunction(
      (stepIndex) =>
        (window.GameProblemManager?.currentSolutionStepIndex ?? -1) > stepIndex,
      Number(stepBefore.stepIndex),
      { timeout: 5000 },
    );
    await page.waitForFunction(
      (previousComplexity) =>
        (window.CyberpunkInteractionAudio?._drumComplexity ?? -1) >
        previousComplexity,
      before,
      { timeout: 5000 },
    );

    const after = await page.evaluate(() => ({
      complexity: window.CyberpunkInteractionAudio?._drumComplexity ?? null,
      stepIndex: window.GameProblemManager?.currentSolutionStepIndex ?? null,
    }));

    expect(after.stepIndex).toBeGreaterThan(Number(stepBefore.stepIndex));
    expect(after.complexity).toBeGreaterThan(before);
  });

  test("complexity ramps across successive line-completion events", async ({
    page,
  }) => {
    await gotoDrumTestPage(page);
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return { hasAudio: false };

      const complexities = [audio._drumComplexity];
      for (let i = 0; i < 5; i += 1) {
        document.dispatchEvent(
          new CustomEvent("problemLineCompleted", {
            detail: { lineNumber: i + 1, totalLines: 6, isLastStep: false },
          }),
        );
        complexities.push(audio._drumComplexity);
      }
      return {
        hasAudio: true,
        disabled: audio.disabled === true,
        complexities,
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.complexities).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("drum gain initializes above the subtle background baseline", async ({
    page,
  }) => {
    await gotoDrumTestPage(page);
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return { hasAudio: false };
      audio._ensureContext();
      audio._drumEnsureGain();
      return {
        hasAudio: true,
        disabled: audio.disabled === true,
        gainValue: audio._drumGain?.gain?.value ?? -1,
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.gainValue).toBeCloseTo(0.05, 3);
  });

  test("mute state reduces drum gain", async ({ page }) => {
    await gotoDrumTestPage(page);
    await page.waitForLoadState("networkidle");

    const result = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return { hasAudio: false };
      audio._ensureContext();
      audio._drumEnsureGain();
      document.dispatchEvent(
        new CustomEvent("cyberpunkAudioStateChanged", {
          detail: { muted: true, available: true, reason: "test" },
        }),
      );
      await new Promise((resolve) => window.setTimeout(resolve, 100));
      return {
        hasAudio: true,
        disabled: audio.disabled === true,
        gainValue: audio._drumGain?.gain?.value ?? -1,
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.gainValue).toBeLessThan(0.01);
  });
});

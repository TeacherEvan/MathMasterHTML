import { expect, test } from "@playwright/test";

test.describe("Interaction audio row-complete routing", () => {
  test("plays the row-complete cue only for green-worm provenance", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "This audio contract runs on the Chromium gameplay project.",
    );

    await page.addInitScript(() => {
      window.__MM_ENABLE_AUDIO_IN_TESTS = true;
    });

    await page.goto("/src/pages/game.html?level=beginner&preload=off");
    await page.waitForFunction(
      () => Boolean(window.CyberpunkInteractionAudio && window.GameEvents),
      { timeout: 10000 },
    );

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) {
        return { hasAudio: false, calls: 0 };
      }

      let calls = 0;
      audio.playRowCompleteCue = () => {
        calls += 1;
      };

      document.dispatchEvent(
        new CustomEvent(window.GameEvents.PROBLEM_LINE_COMPLETED, {
          detail: {
            lineNumber: 1,
            source: "tutorial",
          },
        }),
      );

      document.dispatchEvent(
        new CustomEvent(window.GameEvents.PROBLEM_LINE_COMPLETED, {
          detail: {
            lineNumber: 1,
            source: "greenWormCompletion",
          },
        }),
      );

      return {
        hasAudio: true,
        calls,
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.calls).toBe(1);
  });
});
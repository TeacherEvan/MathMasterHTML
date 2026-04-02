/**
 * tests/drum-fallback.spec.js - Playwright coverage for procedural drum fallback
 */
import { expect, test } from "@playwright/test";

test.describe("DrumProceduralFallback", () => {
  test("should synthesize a kick hit when sample buffer is unavailable", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) {
        return { delegated: false, error: "audio-missing" };
      }

      audio.context = audio.context || {};
      audio._drumGain = audio._drumGain || {};
      audio._drumBuffers = {
        kick: null,
        snare: null,
        hihat: null,
        accent: null,
      };

      const originalProcedural = audio._playDrumHitProcedural;
      let delegated = false;

      audio._playDrumHitProcedural = (sampleName, time, volume) => {
        delegated = sampleName === "kick" && time === 1 && volume === 0.5;
      };

      try {
        audio._playDrumHit("kick", 1, 0.5);
        return { delegated };
      } catch (error) {
        return { delegated: false, error: error?.message || String(error) };
      } finally {
        if (originalProcedural) {
          audio._playDrumHitProcedural = originalProcedural;
        } else {
          delete audio._playDrumHitProcedural;
        }
      }
    });

    expect(result.delegated).toBe(true);
  });
});

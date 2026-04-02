/**
 * tests/drum-audio-loader.spec.js - Playwright coverage for drum sample loader
 */
import { expect, test } from "@playwright/test";

test.describe("DrumAudioLoader", () => {
  test("should expose loadDrumSamples on audio instance", async ({ page }) => {
    await page.goto("/game.html?level=beginner");
    const hasMethod = await page.evaluate(() => {
      return (
        typeof window.CyberpunkInteractionAudio?.loadDrumSamples === "function"
      );
    });
    expect(hasMethod).toBe(true);
  });

  test("should load available drum buffers", async ({ page }) => {
    await page.goto("/game.html?level=beginner");
    const result = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return { skipped: true };
      await audio.loadDrumSamples();
      return {
        keys: Object.keys(audio._drumBuffers || {}),
        hasMap: !!audio._drumBuffers,
      };
    });
    if (result.skipped) return;
    expect(result.hasMap).toBe(true);
    expect(result.keys).toContain("kick");
    expect(result.keys).toContain("snare");
    expect(result.keys).toContain("hihat");
    expect(result.keys).toContain("accent");
  });

  test("should gracefully handle missing audio files", async ({ page }) => {
    await page.goto("/game.html?level=beginner");
    const noCrash = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return true;
      const originalFetch = window.fetch;
      window.fetch = () => Promise.resolve(new Response(null, { status: 404 }));
      try {
        await audio.loadDrumSamples();
        return true;
      } catch {
        return false;
      } finally {
        window.fetch = originalFetch;
      }
    });
    expect(noCrash).toBe(true);
  });
});

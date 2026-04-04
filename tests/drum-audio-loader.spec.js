/**
 * tests/drum-audio-loader.spec.js - Playwright coverage for drum sample loader
 */
import { expect, test } from "@playwright/test";

async function gotoDrumTestPage(page) {
  await page.addInitScript(() => {
    window.__MM_ENABLE_AUDIO_IN_TESTS = true;
  });
  await page.goto("/game.html?level=beginner");
}

test.describe("DrumAudioLoader", () => {
  test("should expose loadDrumSamples on audio instance", async ({ page }) => {
    await gotoDrumTestPage(page);
    const hasMethod = await page.evaluate(() => {
      return (
        typeof window.CyberpunkInteractionAudio?.loadDrumSamples === "function"
      );
    });
    expect(hasMethod).toBe(true);
  });

  test("should load available drum buffers", async ({ page }) => {
    await gotoDrumTestPage(page);
    const result = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return { hasAudio: false };
      await audio.loadDrumSamples();
      return {
        hasAudio: true,
        disabled: audio.disabled === true,
        keys: Object.keys(audio._drumBuffers || {}),
        hasMap: !!audio._drumBuffers,
      };
    });
    expect(result.hasAudio).toBe(true);
    expect(result.disabled).toBe(false);
    expect(result.hasMap).toBe(true);
    expect(result.keys).toContain("kick");
    expect(result.keys).toContain("snare");
    expect(result.keys).toContain("hihat");
    expect(result.keys).toContain("accent");
  });

  test("should gracefully handle missing audio files", async ({ page }) => {
    await gotoDrumTestPage(page);
    const noCrash = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) return false;
      const originalFetch = window.fetch;
      window.fetch = () => Promise.resolve(new Response(null, { status: 404 }));
      try {
        await audio.loadDrumSamples();
        return audio.disabled !== true;
      } catch {
        return false;
      } finally {
        window.fetch = originalFetch;
      }
    });
    expect(noCrash).toBe(true);
  });
});

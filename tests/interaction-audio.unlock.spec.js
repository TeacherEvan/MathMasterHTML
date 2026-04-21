import { expect, test } from "@playwright/test";

test.describe("Interaction audio unlock", () => {
  test("replays a queued cue after async audio unlock completes", async ({ page }) => {
    await page.addInitScript(() => {
      window.__MM_ENABLE_AUDIO_IN_TESTS = true;
    });

    await page.goto("/src/pages/game.html?level=beginner");
    await page.waitForFunction(
      () => Boolean(window.CyberpunkInteractionAudio?.playUiButton),
      { timeout: 10000 },
    );

    const result = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) {
        return { hasAudio: false };
      }

      let contextState = "suspended";
      let resumed = 0;
      let oscillatorStarts = 0;

      const fakeGainNode = {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
          value: 0,
        },
        connect() {},
        disconnect() {},
      };
      const fakeOscillator = {
        type: "triangle",
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        detune: {
          setValueAtTime() {},
        },
        connect() {},
        disconnect() {},
        start() {
          oscillatorStarts += 1;
        },
        stop() {
          if (typeof this.onended === "function") {
            this.onended();
          }
        },
      };
      const fakeFilter = {
        type: "bandpass",
        frequency: {
          setValueAtTime() {},
        },
        Q: {
          value: 0,
        },
        connect() {},
        disconnect() {},
      };
      const fakePanner = {
        pan: {
          value: 0,
        },
        connect() {},
      };
      const fakeContext = {
        get state() {
          return contextState;
        },
        currentTime: 1,
        destination: {},
        createGain() {
          return fakeGainNode;
        },
        createDynamicsCompressor() {
          return {
            threshold: { value: 0 },
            knee: { value: 0 },
            ratio: { value: 0 },
            attack: { value: 0 },
            release: { value: 0 },
            connect() {},
          };
        },
        createOscillator() {
          return fakeOscillator;
        },
        createBiquadFilter() {
          return fakeFilter;
        },
        createStereoPanner() {
          return fakePanner;
        },
        resume() {
          resumed += 1;
          contextState = "running";
          return Promise.resolve();
        },
      };

      audio.context = fakeContext;
      audio.masterGain = {
        connect() {},
        disconnect() {},
        gain: { value: 0 },
      };
      audio.activeVoices = 0;
      audio.lastCueTimes.clear();
      audio._pendingCueNames?.clear?.();

      audio.playUiButton();
      await new Promise((resolve) => setTimeout(resolve, 0));

      return {
        hasAudio: true,
        resumed,
        oscillatorStarts,
        pendingCueCount: audio._pendingCueNames?.size ?? null,
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.resumed).toBe(1);
    expect(result.oscillatorStarts).toBeGreaterThan(0);
    expect(result.pendingCueCount).toBe(0);
  });

  test("uses the upgraded master gain baseline when unmuted", async ({ page }) => {
    await page.addInitScript(() => {
      window.__MM_ENABLE_AUDIO_IN_TESTS = true;
    });

    await page.goto("/src/pages/game.html?level=beginner&preload=off");
    await page.waitForFunction(
      () => Boolean(window.CyberpunkInteractionAudio?._ensureContext),
      { timeout: 10000 },
    );

    const result = await page.evaluate(() => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio) {
        return { hasAudio: false, gain: null };
      }

      audio.context = null;
      audio.masterGain = null;
      audio.disabled = false;
      audio._ensureContext();

      return {
        hasAudio: true,
        gain: audio.masterGain?.gain?.value ?? null,
      };
    });

    expect(result.hasAudio).toBe(true);
    expect(result.gain).toBeGreaterThanOrEqual(0.14);
  });
});

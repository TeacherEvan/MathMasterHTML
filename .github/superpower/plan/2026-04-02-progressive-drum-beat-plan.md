# Progressive Drum Beat System — Implementation Plan

**Goal:** Add a session-persistent progressive drum beat that increases in rhythmic complexity with each line solved, using AI-generated one-shot samples where they are good enough and procedural synthesis where they are not.

**Architecture:** A new `interaction-audio.cyberpunk.drums.js` module extends `CyberpunkInteractionAudioClass` via the existing prototype-extension pattern. It shares the existing `AudioContext`, routes playback through a `drumGain` node connected to `masterGain`, listens to `problemLineCompleted`, and uses a Web Audio lookahead scheduler to increase rhythmic complexity over time.

**Tech Stack:** Browser JavaScript, Web Audio API, HuggingFace (Auffusion + MusicGen at design time only), Playwright, existing `npm` validation scripts.

**Source design:** Conversation-approved design on 2026-04-02.

---

## Existing infrastructure

| Asset                 | Location                                               | What it provides                                                                |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Audio core            | `src/scripts/interaction-audio.cyberpunk.js`           | Shared `AudioContext`, `masterGain`, cue scheduling, unlock flow                |
| Audio state           | `src/scripts/interaction-audio.cyberpunk.state.js`     | Mute state, storage, `cyberpunkAudioStateChanged` event                         |
| Gameplay cues         | `src/scripts/interaction-audio.cyberpunk.gameplay.js`  | Existing procedural SFX patterns for symbol/reveal/line complete                |
| Audio bootstrap       | `src/scripts/interaction-audio.cyberpunk.bootstrap.js` | Instantiates `window.CyberpunkInteractionAudio`                                 |
| Event constants       | `src/scripts/constants.events.js`                      | `problemLineCompleted` and related event contracts                              |
| Problem line emission | `src/scripts/game-symbol-handler.core.js`              | Dispatches `problemLineCompleted` with `lineNumber`, `totalLines`, `isLastStep` |
| Runtime page          | `src/pages/game.html`                                  | Script-tag load order for audio modules                                         |
| Test harness          | `playwright.config.js`                                 | Playwright configuration with Chromium project                                  |
| Validation scripts    | `package.json`                                         | `npm run lint`, `npm run verify`, `npm run typecheck`, `npm test`               |

---

## Phase 0: AI sample pre-production

> **Goal:** Generate optional premium drum one-shots without making the runtime dependent on external services.

### Task 0.1: Prepare prompts and candidate samples

#### Task 0.1 — Step 1: Prepare prompt set

- Output target directory: `src/assets/audio/drums/`
- Prompt set:
  - Kick: `dark cyberpunk electronic kick drum, short punchy 808, dry`
  - Snare: `electronic snare drum, tight cyberpunk, short reverb tail`
  - Hi-hat: `closed hi-hat, crisp metallic, electronic`
  - Accent: `cyberpunk percussion accent, digital clap`

#### Task 0.1 — Step 2: Generate candidates in Auffusion

- Expected output: at least 2 candidates per instrument.

#### Task 0.1 — Step 3: Generate candidates in MusicGen

- Expected output: at least 2 candidates per instrument.

#### Task 0.1 — Step 4: Select and export the best samples

- Export targets:
  - `src/assets/audio/drums/kick.mp3`
  - `src/assets/audio/drums/kick.ogg`
  - `src/assets/audio/drums/snare.mp3`
  - `src/assets/audio/drums/snare.ogg`
  - `src/assets/audio/drums/hihat.mp3`
  - `src/assets/audio/drums/hihat.ogg`
  - `src/assets/audio/drums/accent.mp3`
  - `src/assets/audio/drums/accent.ogg`
- Expected output: short one-shot files, ideally under ~15 KB each.

#### Task 0.1 — Step 5: Fall back to procedural-only runtime if samples are not good enough

- Expected output: implementation remains fully functional even with no committed drum assets.

---

## Phase 1: Drum sample loader

### Task 1.1: Write the failing test for drum sample loading

#### Task 1.1 — Step 1: Create the loader test file

- File: `tests/drum-audio-loader.spec.js`

- Code:

```javascript
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
```

#### Task 1.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/unit/drum-audio-loader.spec.js --project=chromium
#### Task 1.1 — Step 2: Run the test and verify failure

npx playwright test tests/drum-audio-loader.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/drum-audio-loader.spec.js
```

### Task 1.2: Implement the sample loader

#### Task 1.2 — Step 1: Create `interaction-audio.cyberpunk.drums.js`

- File: `src/scripts/interaction-audio.cyberpunk.drums.js`
- Code:

```javascript
// src/scripts/interaction-audio.cyberpunk.drums.js - Progressive drum beat system
console.log("🥁 Cyberpunk Drum System loading...");

(function attachCyberpunkDrumSystem() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn("🥁 Cyberpunk Interaction Audio core missing for drum system");
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;
  const DRUM_ASSETS = "/src/assets/audio/drums/";
  const SAMPLE_NAMES = ["kick", "snare", "hihat", "accent"];

  proto.loadDrumSamples = async function loadDrumSamples() {
    const context = this._ensureContext();
    if (!context) return;

    this._drumBuffers = this._drumBuffers || {};

    const loads = SAMPLE_NAMES.map(async (name) => {
      if (Object.prototype.hasOwnProperty.call(this._drumBuffers, name)) {
        return;
      }

      try {
        const canPlayOgg =
          typeof Audio !== "undefined" &&
          new Audio().canPlayType("audio/ogg; codecs=vorbis");
        const ext = canPlayOgg ? "ogg" : "mp3";
        const response = await fetch(`${DRUM_ASSETS}${name}.${ext}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        this._drumBuffers[name] = await context.decodeAudioData(arrayBuffer);
      } catch (error) {
        console.warn(
          `🥁 Failed to load drum sample '${name}':`,
          error?.message || error,
        );
        this._drumBuffers[name] = null;
      }
    });

    await Promise.all(loads);
  };
})();
```

#### Task 1.2 — Step 2: Load the new script in `src/pages/game.html`

- Insert after:

```html
<script src="/src/scripts/interaction-audio.cyberpunk.encounters.js"></script>
```

- Inserted code:

```html
<script src="/src/scripts/interaction-audio.cyberpunk.drums.js"></script>
```

#### Task 1.2 — Step 3: Run the test and verify success

- Command:

```bash
npx playwright test tests/unit/drum-audio-loader.spec.js --project=chromium
npx playwright test tests/drum-audio-loader.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/drum-audio-loader.spec.js
```

#### Task 1.2 — Step 4: Run lint

- Command:

```bash
npm run lint
```

- Expected output:

```text
No new ESLint errors in drum loader changes
```

---

## Phase 2: Progressive sequencer engine

### Task 2.1: Write the failing test for complexity progression

#### Task 2.1 — Step 1: Create the sequencer test file

- File: `tests/drum-sequencer.spec.js`

- Code:

```javascript
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
```

#### Task 2.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/unit/drum-sequencer.spec.js --project=chromium
npx playwright test tests/drum-sequencer.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/drum-sequencer.spec.js
```

### Task 2.2: Implement the sequencer and complexity mapping

#### Task 2.2 — Step 1: Extend `src/scripts/interaction-audio.cyberpunk.drums.js`

- Add code:

```javascript
(function attachCyberpunkDrumSequencer() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🥁 Cyberpunk Interaction Audio core missing for drum sequencer",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;
  const BPM = 120;
  const STEPS_PER_BEAT = 4;
  const STEP_DURATION = 60 / BPM / STEPS_PER_BEAT;
  const LOOKAHEAD_MS = 25;
  const SCHEDULE_AHEAD_S = 0.1;
  const DRUM_PATTERNS = [
    [],
    [
      [{ s: "kick", v: 1.0 }],
      null,
      null,
      null,
      [{ s: "kick", v: 0.8 }],
      null,
      null,
      null,
      [{ s: "kick", v: 0.9 }],
      null,
      null,
      null,
      [{ s: "kick", v: 0.8 }],
      null,
      null,
      null,
    ],
    [
      [{ s: "kick", v: 1.0 }],
      null,
      [{ s: "hihat", v: 0.5 }],
      null,
      [{ s: "kick", v: 0.8 }],
      null,
      [{ s: "hihat", v: 0.4 }],
      null,
      [{ s: "kick", v: 0.9 }],
      null,
      [{ s: "hihat", v: 0.5 }],
      null,
      [{ s: "kick", v: 0.8 }],
      null,
      [{ s: "hihat", v: 0.4 }],
      null,
    ],
    [
      [{ s: "kick", v: 1.0 }],
      null,
      [{ s: "hihat", v: 0.5 }],
      null,
      [{ s: "snare", v: 0.75 }],
      null,
      [{ s: "hihat", v: 0.4 }],
      null,
      [{ s: "kick", v: 0.9 }],
      null,
      [{ s: "hihat", v: 0.5 }],
      null,
      [{ s: "snare", v: 0.75 }],
      null,
      [{ s: "hihat", v: 0.4 }],
      null,
    ],
    [
      [
        { s: "kick", v: 1.0 },
        { s: "hihat", v: 0.3 },
      ],
      [{ s: "hihat", v: 0.2 }],
      [{ s: "hihat", v: 0.4 }],
      [{ s: "hihat", v: 0.2 }],
      [
        { s: "snare", v: 0.8 },
        { s: "hihat", v: 0.3 },
      ],
      [{ s: "hihat", v: 0.2 }],
      [{ s: "hihat", v: 0.4 }],
      [{ s: "kick", v: 0.4 }],
      [
        { s: "kick", v: 0.9 },
        { s: "hihat", v: 0.3 },
      ],
      [{ s: "hihat", v: 0.2 }],
      [{ s: "hihat", v: 0.4 }],
      [{ s: "hihat", v: 0.2 }],
      [
        { s: "snare", v: 0.8 },
        { s: "hihat", v: 0.3 },
      ],
      [{ s: "hihat", v: 0.2 }],
      [
        { s: "kick", v: 0.35 },
        { s: "hihat", v: 0.4 },
      ],
      [{ s: "accent", v: 0.3 }],
    ],
    [
      [
        { s: "kick", v: 1.0 },
        { s: "hihat", v: 0.35 },
      ],
      [{ s: "hihat", v: 0.2 }],
      [
        { s: "accent", v: 0.3 },
        { s: "hihat", v: 0.4 },
      ],
      [{ s: "hihat", v: 0.15 }],
      [{ s: "snare", v: 0.85 }],
      [
        { s: "kick", v: 0.4 },
        { s: "hihat", v: 0.2 },
      ],
      [{ s: "hihat", v: 0.4 }],
      [
        { s: "snare", v: 0.3 },
        { s: "hihat", v: 0.2 },
      ],
      [
        { s: "kick", v: 0.9 },
        { s: "hihat", v: 0.35 },
      ],
      [{ s: "hihat", v: 0.2 }],
      [{ s: "hihat", v: 0.4 }],
      [
        { s: "kick", v: 0.5 },
        { s: "accent", v: 0.25 },
      ],
      [{ s: "snare", v: 0.85 }],
      [{ s: "hihat", v: 0.2 }],
      [
        { s: "kick", v: 0.4 },
        { s: "hihat", v: 0.4 },
      ],
      [
        { s: "snare", v: 0.25 },
        { s: "accent", v: 0.35 },
      ],
    ],
  ];

  const originalInit = proto.init;

  proto.init = function initWithDrums() {
    this._drumComplexity = 0;
    this._drumMaxComplexity = DRUM_PATTERNS.length - 1;
    this._drumStep = 0;
    this._drumNextStepTime = 0;
    this._drumSchedulerId = null;
    this._drumRunning = false;
    this._drumGain = null;
    this._drumBuffers = this._drumBuffers || {};

    originalInit.call(this);

    if (!this._drumEventBound) {
      this._drumEventBound = true;
      document.addEventListener("problemLineCompleted", () => {
        this._drumAdvanceComplexity();
      });
      document.addEventListener(
        window.CyberpunkInteractionAudioEvents?.stateChanged ||
          "cyberpunkAudioStateChanged",
        (event) => {
          if (this._drumGain && this.context) {
            this._drumGain.gain.setTargetAtTime(
              event.detail?.muted ? 0 : 0.03,
              this.context.currentTime,
              0.05,
            );
          }
        },
      );
    }
  };

  proto._drumEnsureGain = function _drumEnsureGain() {
    if (this._drumGain) return this._drumGain;
    const context = this._ensureContext();
    if (!context || !this.masterGain) return null;
    this._drumGain = context.createGain();
    this._drumGain.gain.value = this.isMuted ? 0 : 0.03;
    this._drumGain.connect(this.masterGain);
    return this._drumGain;
  };

  proto._drumAdvanceComplexity = function _drumAdvanceComplexity() {
    const previous = this._drumComplexity;
    this._drumComplexity = Math.min(
      this._drumComplexity + 1,
      this._drumMaxComplexity,
    );

    if (previous === 0 && this._drumComplexity > 0 && !this._drumRunning) {
      this.startDrumSequencer();
    }
  };

  proto.startDrumSequencer = async function startDrumSequencer() {
    if (this.disabled || this._drumRunning) return;
    const context = this._ensureContext();
    if (!context) return;
    if (!this._drumEnsureGain()) return;

    await this.loadDrumSamples();

    this._drumRunning = true;
    this._drumStep = 0;
    this._drumNextStepTime = context.currentTime + 0.05;
    this._drumSchedulerId = window.setInterval(() => {
      this._drumSchedule(DRUM_PATTERNS, STEP_DURATION, SCHEDULE_AHEAD_S);
    }, LOOKAHEAD_MS);
  };

  proto.stopDrumSequencer = function stopDrumSequencer() {
    if (this._drumSchedulerId !== null) {
      window.clearInterval(this._drumSchedulerId);
      this._drumSchedulerId = null;
    }
    this._drumRunning = false;
  };

  proto._drumSchedule = function _drumSchedule(
    patterns,
    stepDuration,
    scheduleAhead,
  ) {
    if (!this.context || !this._drumRunning) return;

    while (this._drumNextStepTime < this.context.currentTime + scheduleAhead) {
      const pattern = patterns[this._drumComplexity] || [];
      if (pattern.length > 0) {
        const stepData = pattern[this._drumStep % pattern.length];
        if (stepData) {
          stepData.forEach((hit) => {
            this._playDrumHit(hit.s, this._drumNextStepTime, hit.v);
          });
        }
      }
      this._drumStep += 1;
      this._drumNextStepTime += stepDuration;
    }
  };
})();
```

#### Task 2.2 — Step 2: Run the test and verify success

- Command:

```bash
npx playwright test tests/unit/drum-sequencer.spec.js --project=chromium
npx playwright test tests/drum-sequencer.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/drum-sequencer.spec.js
```

#### Task 2.2 — Step 3: Run lint

- Command:

```bash
npm run lint
```

- Expected output:

```text
No new ESLint errors in sequencer changes
```

---

## Phase 3: Procedural drum fallback

### Task 3.1: Write the failing test for playback fallback

#### Task 3.1 — Step 1: Create the fallback test file

- File: `tests/drum-fallback.spec.js`

- Code:

```javascript
/**
 * tests/drum-fallback.spec.js - Playwright coverage for procedural drum fallback
 */
import { expect, test } from "@playwright/test";

test.describe("DrumProceduralFallback", () => {
  test("should synthesize a kick hit when sample buffer is unavailable", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    const result = await page.evaluate(async () => {
      const audio = window.CyberpunkInteractionAudio;
      if (!audio || audio.disabled) return { skipped: true };
      audio._ensureContext();
      audio._drumEnsureGain();
      audio._drumBuffers = {
        kick: null,
        snare: null,
        hihat: null,
        accent: null,
      };
      try {
        audio._playDrumHit("kick", audio.context.currentTime + 0.01, 0.5);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || String(error) };
      }
    });
    if (result.skipped) return;
    expect(result.ok).toBe(true);
  });
});
```

#### Task 3.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/unit/drum-fallback.spec.js --project=chromium
npx playwright test tests/drum-fallback.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/drum-fallback.spec.js
```

### Task 3.2: Implement `_playDrumHit` and the procedural fallback path

#### Task 3.2 — Step 1: Extend `src/scripts/interaction-audio.cyberpunk.drums.js`

- Add code:

```javascript
(function attachCyberpunkDrumPlayback() {
  if (!window.CyberpunkInteractionAudioClass) {
    console.warn(
      "🥁 Cyberpunk Interaction Audio core missing for drum playback",
    );
    return;
  }

  const proto = window.CyberpunkInteractionAudioClass.prototype;

  proto._playDrumHit = function _playDrumHit(sampleName, time, volume) {
    const context = this.context;
    if (!context || !this._drumGain) return;

    const buffer = this._drumBuffers?.[sampleName];
    if (buffer) {
      const source = context.createBufferSource();
      const gainNode = context.createGain();
      source.buffer = buffer;
      gainNode.gain.setValueAtTime(volume, time);
      source.connect(gainNode);
      gainNode.connect(this._drumGain);
      source.start(time);
      return;
    }

    this._playDrumHitProcedural(sampleName, time, volume);
  };

  proto._playDrumHitProcedural = function _playDrumHitProcedural(
    sampleName,
    time,
    volume,
  ) {
    const context = this.context;
    if (!context || !this._drumGain) return;

    const gainNode = context.createGain();
    gainNode.connect(this._drumGain);

    if (sampleName === "kick") {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
      gainNode.gain.setValueAtTime(volume, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gainNode);
      osc.start(time);
      osc.stop(time + 0.16);
      return;
    }

    if (sampleName === "snare" || sampleName === "hihat") {
      const duration = sampleName === "snare" ? 0.08 : 0.04;
      const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
      const noiseBuffer = context.createBuffer(
        1,
        bufferSize,
        context.sampleRate,
      );
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      filter.type = sampleName === "snare" ? "bandpass" : "highpass";
      filter.frequency.value = sampleName === "snare" ? 3000 : 7000;
      filter.Q.value = sampleName === "snare" ? 0.7 : 1.2;
      gainNode.gain.setValueAtTime(
        volume * (sampleName === "snare" ? 0.6 : 0.4),
        time,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        time + (sampleName === "snare" ? 0.1 : 0.05),
      );
      noise.buffer = noiseBuffer;
      noise.connect(filter);
      filter.connect(gainNode);
      noise.start(time);
      noise.stop(time + duration + 0.02);
      return;
    }

    const osc = context.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.03);
    gainNode.gain.setValueAtTime(volume * 0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gainNode);
    osc.start(time);
    osc.stop(time + 0.05);
  };
})();
```

#### Task 3.2 — Step 2: Run the test and verify success

- Command:

```bash
npx playwright test tests/unit/drum-fallback.spec.js --project=chromium
npx playwright test tests/drum-fallback.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/drum-fallback.spec.js
```

---

## Phase 4: Runtime integration test

### Task 4.1: Write the failing integration test for progressive drum behavior

#### Task 4.1 — Step 1: Create the integration test file

- File: `tests/drum-progressive.spec.js`
- Code:

```javascript
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
```

#### Task 4.1 — Step 2: Run the test and verify failure

- Command:

```bash
npx playwright test tests/drum-progressive.spec.js --project=chromium
```

- Expected output:

```text
FAIL tests/drum-progressive.spec.js
```

### Task 4.2: Resolve any integration issues revealed by the failing test

#### Task 4.2 — Step 1: Adjust load order and state wiring if needed

- Files:
  - `src/pages/game.html`
  - `src/scripts/interaction-audio.cyberpunk.drums.js`
- Expected implementation outcomes:
  - drum module loads before bootstrap
  - mute events update `drumGain`
  - first line completion starts the sequencer automatically

#### Task 4.2 — Step 2: Run the test and verify success

- Command:

```bash
npx playwright test tests/drum-progressive.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/drum-progressive.spec.js
```

---

## Phase 5: Full validation

### Task 5.1: Run targeted and regression validation

#### Task 5.1 — Step 1: Run all drum-focused tests

- Command:

```bash
npx playwright test tests/drum-audio-loader.spec.js tests/drum-sequencer.spec.js tests/drum-fallback.spec.js tests/drum-progressive.spec.js --project=chromium
```

- Expected output:

```text
PASS tests/drum-audio-loader.spec.js
PASS tests/drum-sequencer.spec.js
PASS tests/drum-fallback.spec.js
PASS tests/drum-progressive.spec.js
```

#### Task 5.1 — Step 2: Run lint

- Command:

```bash
npm run lint
```

- Expected output:

```text
No new ESLint errors
```

#### Task 5.1 — Step 3: Run typecheck

- Command:

```bash
npm run typecheck
```

- Expected output:

```text
Typecheck passes without regressions
```

#### Task 5.1 — Step 4: Run verify

- Command:

```bash
npm run verify
```

- Expected output:

```text
Verification passes
```

#### Task 5.1 — Step 5: Run Chromium regression coverage

- Command:

```bash
npx playwright test --project=chromium
```

- Expected output:

```text
Existing Chromium browser tests remain green
```

---

## Files to create or modify

| File                                               | Action          | Purpose                                                           |
| -------------------------------------------------- | --------------- | ----------------------------------------------------------------- |
| `src/scripts/interaction-audio.cyberpunk.drums.js` | Create          | Drum sample loading, sequencing, mute handling, playback fallback |
| `src/pages/game.html`                              | Modify          | Load the drum module before audio bootstrap                       |
| `src/assets/audio/drums/`                          | Optional create | AI-generated drum one-shot assets                                 |
| `tests/drum-audio-loader.spec.js`                  | Create          | Sample loader coverage                                            |
| `tests/drum-sequencer.spec.js`                     | Create          | Sequencer state and complexity coverage                           |
| `tests/drum-fallback.spec.js`                      | Create          | Procedural playback fallback coverage                             |
| `tests/drum-progressive.spec.js`                   | Create          | End-to-end behavior verification                                  |

---

## Handoff criteria

- [x] Requirements reviewed from conversation history
- [x] Event-driven architecture preserved
- [x] Every implementation task follows test → fail → implement → pass structure
- [x] Exact file paths provided
- [x] Exact commands provided
- [x] Expected outputs provided
- [x] Plan saved to `.github/superpower/plan/2026-04-02-progressive-drum-beat-plan.md`
- [ ] Hand off to `superpower-execute — Execute Plans Task by Task`

# MathMaster Power-Up Glitch Animation Implementation Plan

**Goal:** Implement a maximalist cyber glitch animation on HUD power-up activation.
**Architecture:** Pure JS event-driven script (`worm-powerups.ui.glitch.js`) attached to `powerUpActivated`, mutating CSS custom properties and exact values via `requestAnimationFrame` and `element.style`. Includes a clean fallback for `prefers-reduced-motion: reduce`.
**Tech Stack:** HTML/JS runtime, CSS Variables, Playwright (for e2e testing).

---

### Task 1: Route the glitch animation logic and hook it into the HTML

**Step 1: Write the failing test**

- File: `tests/powerups-glitch.spec.js`
- Code:

  ```javascript
  import { expect, test } from "@playwright/test";

  test.describe("HUD Power-Up Glitch Animation", () => {
    test("should apply glitch transform styles on powerUpActivated event", async ({
      page,
    }) => {
      await page.goto("/src/pages/game.html?level=beginner");

      // Wait for UI to initialize
      await page.waitForFunction(() => !!window.wormSystem?.powerUpSystem);

      // Add a spider powerup to inventory
      await page.evaluate(() => {
        window.wormSystem.powerUpSystem.inventory.spider = 1;
        window.wormSystem.powerUpSystem.updateDisplay();
      });

      const targetEl = page.locator('.power-up-item[data-type="spider"]');
      await expect(targetEl).toBeVisible();

      // Trigger the activation event
      await page.evaluate(() => {
        document.dispatchEvent(
          new CustomEvent("powerUpActivated", {
            detail: { type: "spider" },
          }),
        );
      });

      // The glitch inline styles should be injected within a very short timeframe
      // We expect transform to be added as inline style.
      await expect(targetEl).toHaveAttribute("style", /transform:/, {
        timeout: 150,
      });
    });

    test("should clean up styles after animation ends", async ({ page }) => {
      await page.goto("/src/pages/game.html?level=beginner");
      await page.waitForFunction(() => !!window.wormSystem?.powerUpSystem);

      // Add chain lightning
      await page.evaluate(() => {
        window.wormSystem.powerUpSystem.inventory.chainLightning = 1;
        window.wormSystem.powerUpSystem.updateDisplay();
      });

      const targetEl = page.locator(
        '.power-up-item[data-type="chainLightning"]',
      );

      await page.evaluate(() => {
        document.dispatchEvent(
          new CustomEvent("powerUpActivated", {
            detail: { type: "chainLightning" },
          }),
        );
      });

      // Animation takes 250ms, wait 400ms to ensure cleanup has completed
      await page.waitForTimeout(400);

      // Transform style override should be cleared
      const styleAttr = await targetEl.getAttribute("style");
      if (styleAttr) {
        expect(styleAttr).not.toContain("transform:");
      }
    });
  });
  ```

**Step 2: Run test and verify failure**

- Command: `npx playwright test tests/powerups-glitch.spec.js --project=chromium`
- Expected output:

  ```
  Running 2 tests using 1 worker

  ✘  1 tests/powerups-glitch.spec.js:5:5 › HUD Power-Up Glitch Animation › should apply glitch transform styles on powerUpActivated event
  ...
  Error: Timed out 150ms waiting for expect(locator).toHaveAttribute(expected)
  ```

**Step 3: Implement minimal code across files**

- File: `src/scripts/worm-powerups.ui.glitch.js`
- Code:

  ```javascript
  // src/scripts/worm-powerups.ui.glitch.js
  (function () {
    const GLITCH_DURATION = 250;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    function runGlitchAnimation(targetElement) {
      if (!targetElement) return;

      if (prefersReducedMotion.matches) {
        // Accessible fallback: instant simple acknowledgment without motion
        const originalTransition = targetElement.style.transition;
        const originalBackground = targetElement.style.background;
        targetElement.style.transition = "none";
        targetElement.style.background = "var(--neon-magenta, #ff00ff)";
        setTimeout(() => {
          targetElement.style.transition = originalTransition;
          targetElement.style.background = originalBackground;
        }, 150);
        return;
      }

      const startTime = performance.now();

      function frame(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / GLITCH_DURATION, 1);

        let skew = 0;
        let opacity = 1;
        let scale = 1;
        let transX = 0;
        let transY = 0;
        let boxShadow = "";

        if (progress < 1) {
          if (progress < 0.3) {
            // Frames 1-3: Skew & Opacity drop
            skew = (Math.random() - 0.5) * 40; // -20deg to 20deg
            opacity = Math.random() > 0.5 ? 0.4 : 1;
          } else if (progress < 0.6) {
            // Frames 4-6: Scale & Translate
            scale = 1.1;
            transX = (Math.random() - 0.5) * 10;
            transY = (Math.random() - 0.5) * 10;
          } else {
            // Frames 7-10: Settle with ease-out-expo behavior
            const normalizedProgress = Math.max(0, (progress - 0.6) / 0.4);
            const easeOutExpo =
              normalizedProgress === 1
                ? 1
                : 1 - Math.pow(2, -10 * normalizedProgress);
            scale = 1.1 - 0.1 * easeOutExpo; // Decelerates back to 1.0
            boxShadow = `0 0 15px rgba(0, 255, 255, ${1 - easeOutExpo})`;
          }

          targetElement.style.transform = `skewX(${skew}deg) scale(${scale}) translate(${transX}px, ${transY}px)`;
          targetElement.style.opacity = opacity.toString();
          targetElement.style.boxShadow = boxShadow;

          requestAnimationFrame(frame);
        } else {
          // Cleanup all injected glitch styles
          targetElement.style.transform = "";
          targetElement.style.opacity = "";
          targetElement.style.boxShadow = "";
        }
      }

      requestAnimationFrame(frame);
    }

    document.addEventListener("powerUpActivated", (event) => {
      const type = event.detail?.type;
      if (!type) return;

      const displayContainer = document.getElementById("power-up-display");
      if (!displayContainer) return;

      const targetElement = displayContainer.querySelector(
        `.power-up-item[data-type="${type}"]`,
      );
      if (targetElement) {
        runGlitchAnimation(targetElement);
      }
    });
  })();
  ```

**Step 4: Hook into HTML**

- File: `src/pages/game.html`
- Command: (Manual insert or exact string replacement) Let's assume the agent uses edit string for `<script src="/src/scripts/worm-powerups.ui.js"></script>` to add the new script immediately following it.

**Step 5: Run test and verify success**

- Command: `npx playwright test tests/powerups-glitch.spec.js --project=chromium`
- Expected output:

  ```
  Running 2 tests using 1 worker

  ✓  1 tests/powerups-glitch.spec.js:5:5 › HUD Power-Up Glitch Animation › should apply glitch transform styles on powerUpActivated event (805ms)
  ✓  2 tests/powerups-glitch.spec.js:.. › HUD Power-Up Glitch Animation › should clean up styles after animation ends (1002ms)
  ```

import { devices, expect, test } from "@playwright/test";

test.describe("Gameplay portrait device contract", () => {
  test.describe("portrait phone rotation contract", () => {
    const pixel7 = devices["Pixel 7"];

    test.skip(
      ({ browserName }) => browserName === "firefox",
      "Firefox does not support Playwright mobile-context emulation for this contract suite.",
    );

    test.use({
      isMobile: pixel7.isMobile,
      hasTouch: pixel7.hasTouch,
      userAgent: pixel7.userAgent,
      deviceScaleFactor: pixel7.deviceScaleFactor,
      viewport: { width: 412, height: 915 },
      screen: { width: 412, height: 915 },
    });

    test("marks narrow portrait phones for rotation without falling into a hybrid layout state", async ({
      page,
    }) => {
      await page.goto("/src/pages/game.html?level=beginner", {
        waitUntil: "domcontentloaded",
      });

      const startButton = page.locator("#start-game-btn");
      if (await startButton.isVisible()) {
        await startButton.click({ force: true });
      }

      await page.waitForFunction(() => {
        const overlay = document.getElementById("rotation-overlay");
        return (
          document.body.classList.contains("viewport-rotate-required") &&
          document.body.classList.contains("viewport-portrait") &&
          overlay &&
          window.getComputedStyle(overlay).display === "none"
        );
      });

      const layout = await page.evaluate(() => ({
        bodyClasses: document.body.className,
        activeResolution:
          window.displayManager?.getCurrentResolution?.()?.name ?? null,
        shouldShowRotationOverlay:
          window.displayManager?.getCurrentResolution?.()
            ?.shouldShowRotationOverlay ?? null,
      }));

      expect(layout.bodyClasses).toContain("viewport-rotate-required");
      expect(layout.bodyClasses).toContain("viewport-compact");
      expect(layout.activeResolution).toBe("mobile");
      expect(layout.shouldShowRotationOverlay).toBe(true);
    });
  });

  test.describe("portrait tablet layout contract", () => {
    const iPadMini = devices["iPad Mini"];

    test.skip(
      ({ browserName }) => browserName === "firefox",
      "Firefox does not support Playwright mobile-context emulation for this contract suite.",
    );

    test.use({
      isMobile: iPadMini.isMobile,
      hasTouch: iPadMini.hasTouch,
      userAgent: iPadMini.userAgent,
      deviceScaleFactor: iPadMini.deviceScaleFactor,
      viewport: { width: 768, height: 1024 },
      screen: { width: 768, height: 1024 },
    });

    test("keeps gameplay visible on portrait tablets without the rotate gate or compact-phone layout", async ({
      page,
    }) => {
      await page.goto("/src/pages/game.html?level=beginner", {
        waitUntil: "domcontentloaded",
      });

      const startButton = page.locator("#start-game-btn");
      if (await startButton.isVisible()) {
        await startButton.click({ force: true });
      }

      await page.waitForFunction(() => {
        const overlay = document.getElementById("rotation-overlay");
        return (
          document.body.classList.contains("viewport-standard") &&
          document.body.classList.contains("viewport-portrait") &&
          document.body.classList.contains("viewport-rotate-not-required") &&
          overlay &&
          window.getComputedStyle(overlay).display === "none"
        );
      });

      const layout = await page.evaluate(() => {
        const measure = (selector) => {
          const element = document.querySelector(selector);
          if (!element) {
            return null;
          }

          const rect = element.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            width: rect.width,
            height: rect.height,
          };
        };

        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          bodyClasses: document.body.className,
          activeResolution:
            window.displayManager?.getCurrentResolution?.()?.name ?? null,
          overlayDisplay: window.getComputedStyle(
            document.getElementById("rotation-overlay"),
          ).display,
          panelA: measure("#panel-a"),
          panelB: measure("#panel-b"),
          panelC: measure("#panel-c"),
          console: measure("#symbol-console"),
        };
      });

      expect(layout.bodyClasses).toContain("viewport-standard");
      expect(layout.bodyClasses).not.toContain("viewport-compact");
      expect(layout.activeResolution).toBe("720p");
      expect(layout.overlayDisplay).toBe("none");
      expect(layout.panelA.bottom).toBeLessThanOrEqual(
        layout.viewport.height + 1,
      );
      expect(layout.panelB.bottom).toBeLessThanOrEqual(
        layout.viewport.height + 1,
      );
      expect(layout.panelC.bottom).toBeLessThanOrEqual(
        layout.viewport.height + 1,
      );
      expect(layout.console.left).toBeGreaterThanOrEqual(
        layout.panelB.left - 1,
      );
      expect(layout.console.right).toBeLessThanOrEqual(layout.panelB.right + 1);
      expect(layout.console.bottom).toBeLessThanOrEqual(
        layout.panelB.bottom + 1,
      );
    });
  });
});

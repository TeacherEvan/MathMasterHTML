import { devices, expect, test } from "@playwright/test";

test.describe("Gameplay portrait device contract", () => {
  test.describe("portrait phone rotation contract", () => {
    const pixel7 = devices["Pixel 7"];

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        const orientationState = { requests: [] };
        window.__orientationLockState = orientationState;

        try {
          const descriptor = Object.getOwnPropertyDescriptor(screen, "orientation");
          const mockOrientation = {
            type: "portrait-primary",
            angle: 0,
            lock: async (value) => {
              const modal = document.getElementById("how-to-play-modal");
              orientationState.requests.push({
                value,
                modalDisplay: modal ? window.getComputedStyle(modal).display : null,
              });
            },
            unlock: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
          };

          if (!descriptor || descriptor.configurable) {
            Object.defineProperty(screen, "orientation", {
              configurable: true,
              value: mockOrientation,
            });
          }
        } catch {
          window.__orientationLockState.unmocked = true;
        }
      });
    });

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

    test("requires rotation on narrow portrait phones and requests landscape from the start gesture", async ({
      page,
    }) => {
      await page.goto("/src/pages/game.html?level=beginner", {
        waitUntil: "domcontentloaded",
      });

      await page.waitForFunction(() => {
        const overlay = document.getElementById("rotation-overlay");
        return (
          document.body.classList.contains("viewport-rotate-required") &&
          document.body.classList.contains("viewport-portrait") &&
          overlay instanceof HTMLElement &&
          overlay.getAttribute("role") === "dialog" &&
          overlay.getAttribute("aria-hidden") === "false"
        );
      });

      const startButton = page.locator("#start-game-btn");
      if (await startButton.isVisible()) {
        await startButton.click({ force: true });
      }

      await page.waitForTimeout(400);

      const portraitState = await page.evaluate(() => {
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
          shouldShowRotationOverlay:
            window.displayManager?.getCurrentResolution?.()
              ?.shouldShowRotationOverlay ?? null,
          orientationRequests:
            window.__orientationLockState?.requests?.slice() ?? [],
          runtimeState: window.GameRuntimeCoordinator?.getState?.() ?? null,
          activeElementId: document.activeElement?.id ?? null,
          overlayA11y: (() => {
            const overlay = document.getElementById("rotation-overlay");
            if (!(overlay instanceof HTMLElement)) {
              return null;
            }

            return {
              role: overlay.getAttribute("role"),
              ariaModal: overlay.getAttribute("aria-modal"),
              ariaLive: overlay.getAttribute("aria-live"),
              ariaHidden: overlay.getAttribute("aria-hidden"),
            };
          })(),
          panelA: measure("#panel-a"),
          panelB: measure("#panel-b"),
          panelC: measure("#panel-c"),
          console: measure("#symbol-console"),
        };
      });

      expect(portraitState.bodyClasses).toContain("viewport-rotate-required");
      expect(portraitState.bodyClasses).toContain("viewport-compact");
      expect(portraitState.activeResolution).toBe("mobile");
      expect(portraitState.shouldShowRotationOverlay).toBe(true);
      expect(portraitState.orientationRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ value: "landscape" }),
        ]),
      );
      expect(portraitState.runtimeState).toEqual(
        expect.objectContaining({
          briefingDismissed: false,
          gameplayReady: false,
          inputLocked: true,
          inputLocks: expect.objectContaining({
            "rotation-required": true,
          }),
        }),
      );
      expect(portraitState.overlayA11y).toEqual(
        expect.objectContaining({
          role: "dialog",
          ariaModal: "true",
          ariaLive: "assertive",
          ariaHidden: "false",
        }),
      );
      expect(portraitState.panelA.bottom).toBeLessThanOrEqual(
        portraitState.viewport.height + 1,
      );
      expect(portraitState.panelB.bottom).toBeLessThanOrEqual(
        portraitState.viewport.height + 1,
      );
      expect(portraitState.panelC.bottom).toBeLessThanOrEqual(
        portraitState.viewport.height + 1,
      );
      expect(portraitState.panelB.top).toBeGreaterThan(
        portraitState.panelA.bottom - 4,
      );
      expect(portraitState.panelC.left).toBeGreaterThan(
        portraitState.panelA.right - 4,
      );
      expect(portraitState.console.left).toBeGreaterThanOrEqual(
        portraitState.panelB.left - 1,
      );
      expect(portraitState.console.right).toBeLessThanOrEqual(
        portraitState.panelB.right + 1,
      );

    });
  });

  test("treats Android WebView-like touch runtimes as compact when coarse-pointer media queries lie", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Manual WebView context contract runs on the chromium project only.",
    );

    const context = await browser.newContext({
      viewport: { width: 980, height: 735 },
      screen: { width: 980, height: 735 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2.625,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query === "(hover: none) and (pointer: coarse)") {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          };
        }

        return originalMatchMedia(query);
      };
    });

    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => Boolean(window.displayManager?.getCurrentResolution?.()),
      { timeout: 10000 },
    );

    const state = await page.evaluate(() => ({
      resolution: window.displayManager?.getCurrentResolution?.() ?? null,
      bodyClasses: document.body.className,
    }));

    expect(state.resolution?.name).toBe("mobile");
    expect(state.resolution?.isCompactViewport).toBe(true);
    expect(state.bodyClasses).toContain("viewport-compact");

    await context.close();
  });

  test("keeps a tablet-style Android WebView runtime on the standard layout path", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Manual WebView context contract runs on the chromium project only.",
    );

    const context = await browser.newContext({
      viewport: { width: 800, height: 900 },
      screen: { width: 800, height: 900 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel Tablet Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query === "(hover: none) and (pointer: coarse)") {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          };
        }

        return originalMatchMedia(query);
      };
    });

    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => Boolean(window.displayManager?.getCurrentResolution?.()),
      { timeout: 10000 },
    );

    const state = await page.evaluate(() => ({
      resolution: window.displayManager?.getCurrentResolution?.() ?? null,
      bodyClasses: document.body.className,
    }));

    expect(state.resolution?.name).toBe("720p");
    expect(state.resolution?.isCompactViewport).toBe(false);
    expect(state.bodyClasses).toContain("viewport-standard");
    expect(state.bodyClasses).not.toContain("viewport-compact");

    await context.close();
  });

  test("keeps a landscape tablet-style Android WebView runtime on the standard layout path without a literal Tablet token", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Manual WebView context contract runs on the chromium project only.",
    );

    const context = await browser.newContext({
      viewport: { width: 900, height: 700 },
      screen: { width: 900, height: 700 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-T970 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query === "(hover: none) and (pointer: coarse)") {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          };
        }

        return originalMatchMedia(query);
      };
    });

    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => Boolean(window.displayManager?.getCurrentResolution?.()),
      { timeout: 10000 },
    );

    const state = await page.evaluate(() => ({
      resolution: window.displayManager?.getCurrentResolution?.() ?? null,
      bodyClasses: document.body.className,
    }));

    expect(state.resolution?.name).toBe("720p");
    expect(state.resolution?.isCompactViewport).toBe(false);
    expect(state.bodyClasses).toContain("viewport-standard");
    expect(state.bodyClasses).not.toContain("viewport-compact");

    await context.close();
  });

  test("keeps an unlisted tablet-style Android WebView runtime on the standard layout path", async ({
    browser,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "Manual WebView context contract runs on the chromium project only.",
    );

    const context = await browser.newContext({
      viewport: { width: 900, height: 700 },
      screen: { width: 900, height: 700 },
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; ZX-Tab-9000 Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/123.0.0.0 Mobile Safari/537.36",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      const originalMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (query === "(hover: none) and (pointer: coarse)") {
          return {
            matches: false,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          };
        }

        return originalMatchMedia(query);
      };
    });

    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForFunction(
      () => Boolean(window.displayManager?.getCurrentResolution?.()),
      { timeout: 10000 },
    );

    const state = await page.evaluate(() => ({
      resolution: window.displayManager?.getCurrentResolution?.() ?? null,
      bodyClasses: document.body.className,
    }));

    expect(state.resolution?.name).toBe("720p");
    expect(state.resolution?.isCompactViewport).toBe(false);
    expect(state.bodyClasses).toContain("viewport-standard");
    expect(state.bodyClasses).not.toContain("viewport-compact");

    await context.close();
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

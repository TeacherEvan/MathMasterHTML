// tests/startup-preload.spec.js
import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

async function waitForBriefingVisible(page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      return modal && getComputedStyle(modal).display === "flex";
    },
    { timeout },
  );
}

async function waitForStartupPreload(page) {
  await page.waitForFunction(
    () => typeof window.StartupPreload?.isBlocking === "function",
    { timeout: 10000 },
  );
}

async function gotoBlockingPreloadRuntime(page, search = "?level=beginner") {
  await page.addInitScript(() => {
    if (
      navigator.serviceWorker &&
      typeof navigator.serviceWorker.register === "function"
    ) {
      navigator.serviceWorker.register = () => new Promise(() => {});
    }
  });

  await gotoGameRuntime(page, search);
  await waitForStartupPreload(page);
}

test.describe("Startup Preload — Build 2", () => {
  test("boot applies settings before onboarding locale is shown after preload completion", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "mathmaster_user_settings_v1",
        JSON.stringify({
          version: 1,
          display: {
            qualityMode: "auto",
            reducedMotion: false,
            fullscreenPreferred: false,
          },
          language: {
            locale: "es-ES",
          },
          sound: {
            muted: false,
            musicEnabled: true,
            effectsEnabled: true,
          },
          updatedAt: Date.now(),
        }),
      );
    });

    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
    });

    await waitForBriefingVisible(page, 3000);

    await expect
      .poll(() =>
        page.evaluate(() => ({
          lang: document.documentElement.lang,
          title: document.getElementById("how-to-play-title")?.textContent?.trim(),
          button: document.getElementById("start-game-btn")?.textContent?.trim(),
        })),
      )
      .toMatchObject({
        lang: "es-ES",
        title: "Desbloquea tu mente",
        button: "Comenzar calibración",
      });
  });

  test("update detection marks app update state without reloading the active runtime", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const registrationListeners = new Map();
      const workerListeners = new Map();
      let reloadCalls = 0;

      const fakeWorker = {
        state: "installing",
        addEventListener(type, callback) {
          workerListeners.set(type, callback);
        },
        postMessage() {},
      };

      const fakeRegistration = {
        scope: "/",
        waiting: null,
        installing: fakeWorker,
        active: {},
        addEventListener(type, callback) {
          registrationListeners.set(type, callback);
        },
        async update() {},
      };

      window.__startupSwTest = {
        isRegistrationReady() {
          return registrationListeners.has("updatefound");
        },
        getReloadCalls() {
          return reloadCalls;
        },
        triggerUpdateFound() {
          registrationListeners.get("updatefound")?.();
        },
        triggerInstalled() {
          fakeWorker.state = "installed";
          workerListeners.get("statechange")?.();
        },
      };

      try {
        const originalReload = window.location.reload.bind(window.location);
        window.location.reload = () => {
          reloadCalls += 1;
          return originalReload();
        };
      } catch {
        // Ignore runtimes that prevent overriding location.reload.
      }

      Object.defineProperty(navigator, "serviceWorker", {
        configurable: true,
        value: {
          controller: {},
          async register() {
            return fakeRegistration;
          },
          async getRegistration() {
            return fakeRegistration;
          },
          addEventListener() {},
        },
      });
    });

    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForStartupPreload(page);

    await expect
      .poll(() => page.evaluate(() => window.__startupSwTest.isRegistrationReady()))
      .toBe(true);

    await page.evaluate(() => {
      window.__startupSwTest.triggerUpdateFound();
      window.__startupSwTest.triggerInstalled();
    });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          available: window.MathMasterAppUpdate?.available === true,
          reloadCalls: window.__startupSwTest.getReloadCalls(),
        })),
      )
      .toEqual({
        available: true,
        reloadCalls: 0,
      });
  });

  test("?swDebug=refresh-update exposes the refresh-to-update diagnostic hook", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off&swDebug=refresh-update");
    await waitForStartupPreload(page);

    await page.waitForFunction(
      () => window._SWDiagnostic?.enabled === true,
      { timeout: 10000 },
    );

    await expect(page.locator("#sw-refresh-update-debug")).toBeVisible();

    const debugButtonMetrics = await page.evaluate(() => {
      const button = document.getElementById("sw-refresh-update-debug");
      if (!button) return null;

      const style = window.getComputedStyle(button);
      const rect = button.getBoundingClientRect();
      return {
        className: button.className,
        minHeight: style.minHeight,
        height: rect.height,
      };
    });

    const state = await page.evaluate(async () => {
      return window._SWDiagnostic?.getState?.();
    });

    expect(state).toBeTruthy();
    expect(state.enabled).toBe(true);
    expect(state.mode).toBe("refresh-update");
    expect(Array.isArray(state.cacheNames)).toBe(true);
    expect(debugButtonMetrics).toBeTruthy();
    expect(debugButtonMetrics.className).toContain("sw-refresh-update-debug");
    expect(debugButtonMetrics.minHeight).toBe("44px");
    expect(debugButtonMetrics.height).toBeGreaterThanOrEqual(44);
  });

  test("briefing dialog exposes semantics and moves focus to the start button", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForStartupPreload(page);
    await waitForBriefingVisible(page, 3000);

    await expect(page.locator("#how-to-play-modal")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    await expect(
      page.locator("#how-to-play-modal [role='dialog']"),
    ).toHaveAttribute("aria-modal", "true");
    await expect(page.locator("#start-game-btn")).toBeFocused();
  });

  test("preload overlay is visible on initial page load", async ({ page }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await expect(page.locator("#startup-preload")).toBeVisible();
    expect(await page.evaluate(() => window.StartupPreload?.isBlocking())).toBe(
      true,
    );
  });

  test("preload overlay reflects dispatched progress updates", async ({ page }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.PRELOAD_PROGRESS, {
          detail: {
            progress: 35,
            message: "Registering service worker...",
          },
        }),
      );
    });

    await expect(page.locator("#startup-preload-message")).toHaveText(
      /Registering service worker(?:\.\.\.|…)/,
    );
    await expect(page.locator("#startup-preload-progress")).toHaveAttribute(
      "aria-valuenow",
      "35",
    );
  });

  test("overlay hides after PRELOAD_READY is dispatched", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner");
    await waitForStartupPreload(page);

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
    });

    await page.waitForFunction(
      () => window.StartupPreload?.isComplete() === true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
  });

  test("overlay hides after PRELOAD_FAILED is dispatched", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner");
    await waitForStartupPreload(page);

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_FAILED));
    });

    await page.waitForFunction(
      () => window.StartupPreload?.isComplete() === true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
  });

  test("briefing modal not visible while preload is blocking", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    const state = await page.evaluate(() => {
      const modal = document.getElementById("how-to-play-modal");
      return {
        blocking: window.StartupPreload?.isBlocking() === true,
        display: modal ? getComputedStyle(modal).display : null,
      };
    });

    expect(state.blocking).toBe(true);
    expect(state.display).toBe("none");
  });

  test("briefing modal visible after forced startup preload completion", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    await page.waitForFunction(
      () => window.StartupPreload?.isComplete() === true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
    await waitForBriefingVisible(page);
    await expect(page.locator("#how-to-play-modal")).toBeVisible();
  });

  test("?preload=off bypasses overlay and shows briefing immediately", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForStartupPreload(page);

    expect(await page.evaluate(() => window.StartupPreload?.isBlocking())).toBe(
      false,
    );
    expect(await page.evaluate(() => window.StartupPreload?.isComplete())).toBe(
      true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
    await waitForBriefingVisible(page, 3000);
  });

  test("safety timeout shows briefing if preload stalls longer than 8s", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await waitForBriefingVisible(page, 12000);
    await page.waitForFunction(
      () => window.StartupPreload?.isBlocking() === false,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
    await expect(page.locator("#start-game-btn")).toBeVisible();
  });
});

// @ts-check
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const SETTINGS_KEY = "mathmaster_user_settings_v1";

test.describe("User settings storage", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!("serviceWorker" in navigator)) {
        return;
      }

      const fakeRegistration = {
        scope: "/",
        waiting: null,
        installing: null,
        active: null,
        update: async () => {},
        addEventListener: () => {},
        unregister: async () => true,
      };

      try {
        navigator.serviceWorker.register = async () => fakeRegistration;
        navigator.serviceWorker.getRegistration = async () => null;
        navigator.serviceWorker.getRegistrations = async () => [];
      } catch {
        // Ignore environments that do not allow overriding these methods.
      }
    });
  });

  test("loads a default versioned settings object when storage is empty", async ({
    page,
  }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => window.UserSettings?.getSettings?.() || null),
      )
      .toMatchObject({
        version: 1,
        display: {
          qualityMode: "auto",
          reducedMotion: false,
          fullscreenPreferred: false,
        },
        language: {
          locale: "en-US",
        },
        sound: {
          muted: false,
          musicEnabled: true,
          effectsEnabled: true,
        },
      });
  });

  test("normalizes a legacy partial payload into the current settings shape", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          display: { qualityMode: "high" },
          language: { locale: "es-ES" },
        }),
      );
    }, SETTINGS_KEY);

    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate((storageKey) => {
          return {
            current: window.UserSettings?.getSettings?.() || null,
            stored: JSON.parse(localStorage.getItem(storageKey) || "null"),
          };
        }, SETTINGS_KEY),
      )
      .toMatchObject({
        current: {
          version: 1,
          display: {
            qualityMode: "high",
            reducedMotion: false,
            fullscreenPreferred: false,
          },
          language: {
            locale: "es-ES",
          },
        },
        stored: {
          version: 1,
          display: {
            qualityMode: "high",
            reducedMotion: false,
            fullscreenPreferred: false,
          },
          language: {
            locale: "es-ES",
          },
        },
      });
  });

  test("falls back to in-memory settings when localStorage throws", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      const originalGetItem = Storage.prototype.getItem;
      const originalSetItem = Storage.prototype.setItem;

      Storage.prototype.getItem = function (key) {
        if (key === storageKey) {
          throw new Error("blocked read");
        }
        return originalGetItem.call(this, key);
      };

      Storage.prototype.setItem = function (key, value) {
        if (key === storageKey) {
          throw new Error("blocked write");
        }
        return originalSetItem.call(this, key, value);
      };
    }, SETTINGS_KEY);

    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    const nextSettings = await page.evaluate(async () => {
      return window.UserSettings.updateSettings({
        display: { qualityMode: "medium" },
      });
    });

    expect(nextSettings.display.qualityMode).toBe("medium");
  });

  test("dispatches a settings changed event when preferences update", async ({
    page,
  }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    const eventDetail = await page.evaluate(async () => {
      const details = [];
      document.addEventListener("userSettingsChanged", (event) => {
        details.push(event.detail);
      });

      await window.UserSettings.updateSettings({
        display: { qualityMode: "low" },
      });

      return details[0] || null;
    });

    expect(eventDetail).toMatchObject({
      changedKeys: ["display.qualityMode"],
      source: "updateSettings",
      settings: {
        display: {
          qualityMode: "low",
        },
      },
    });
  });
});
// @ts-check
import { expect, test } from "@playwright/test";

const GAME_URL = "/src/pages/game.html?level=beginner&preload=off";
const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const SETTINGS_KEY = "mathmaster_user_settings_v1";
const SETTINGS_BUTTON_NAME = "Settings";

test.describe("Level select settings", () => {
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

  test("quality override persists and wins over device detection on boot", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          display: {
            qualityMode: "high",
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
          updatedAt: Date.now(),
        }),
      );
    }, SETTINGS_KEY);

    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          appliedTier: window.qualityManager?.getTier?.() || null,
          dataTier: document.body?.dataset?.qualityTier || null,
          detectedTier: window.qualityManager?.detectedTier || null,
        })),
      )
      .toMatchObject({
        appliedTier: "high",
        dataTier: "high",
        detectedTier: expect.any(String),
      });
  });

  test("audio settings apply persisted mute state on boot", async ({ page }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
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
            muted: true,
            musicEnabled: true,
            effectsEnabled: true,
          },
          updatedAt: Date.now(),
        }),
      );
    }, SETTINGS_KEY);

    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          muted: window.CyberpunkInteractionAudio?.isMuted === true,
          buttonLabel:
            document.querySelector("#audio-toggle .audio-toggle__label")
              ?.textContent || null,
        })),
      )
      .toMatchObject({
        muted: true,
        buttonLabel: "Sound off",
      });
  });

  test("audio settings migrate the legacy mute preference into UserSettings", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("mathmaster_audio_pref_v1", "muted");
    });

    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate((storageKey) => {
          const settings = window.UserSettings?.getSettings?.() || null;
          return {
            muted: settings?.sound?.muted ?? null,
            stored: JSON.parse(localStorage.getItem(storageKey) || "null"),
          };
        }, SETTINGS_KEY),
      )
      .toMatchObject({
        muted: true,
        stored: {
          sound: {
            muted: true,
          },
        },
      });
  });

  test("settings UI persists changed values across reload", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: SETTINGS_BUTTON_NAME }).click();
    await expect(page.getByRole("dialog", { name: "Game settings" })).toBeVisible();

    await page.getByLabel("Display quality").selectOption("medium");
    await page.getByLabel("Reduce motion").check();
    await page.getByLabel("Language").selectOption("es-ES");
    await page.getByLabel("Mute sound effects").check();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: SETTINGS_BUTTON_NAME }).click();

    await expect(page.getByLabel("Display quality")).toHaveValue("medium");
    await expect(page.getByLabel("Reduce motion")).toBeChecked();
    await expect(page.getByLabel("Language")).toHaveValue("es-ES");
    await expect(page.getByLabel("Mute sound effects")).toBeChecked();
  });

  test("settings UI resets values to defaults", async ({ page }) => {
    await page.addInitScript((storageKey) => {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          display: {
            qualityMode: "high",
            reducedMotion: true,
            fullscreenPreferred: false,
          },
          language: {
            locale: "es-ES",
          },
          sound: {
            muted: true,
            musicEnabled: true,
            effectsEnabled: true,
          },
          updatedAt: Date.now(),
        }),
      );
    }, SETTINGS_KEY);

    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: SETTINGS_BUTTON_NAME }).click();

    await page.getByRole("button", { name: "Reset settings" }).click();

    await expect(page.getByLabel("Display quality")).toHaveValue("auto");
    await expect(page.getByLabel("Reduce motion")).not.toBeChecked();
    await expect(page.getByLabel("Language")).toHaveValue("en-US");
    await expect(page.getByLabel("Mute sound effects")).not.toBeChecked();
  });

  test("update prompt exposes refresh now inside settings", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      window.__updateUiTest = {
        refreshCalls: 0,
        clearCalls: 0,
      };

      window.refreshToUpdate = async () => {
        window.__updateUiTest.refreshCalls += 1;
      };

      window.clearServiceWorkerCache = async () => {
        window.__updateUiTest.clearCalls += 1;
        return true;
      };

      document.dispatchEvent(
        new CustomEvent(window.GameEvents.APP_UPDATE_AVAILABLE, {
          detail: {
            source: "installed",
            scope: "/",
            buildVersion: window.MathMasterBuildVersion,
            hasController: true,
          },
        }),
      );
    });

    await page.getByRole("button", { name: SETTINGS_BUTTON_NAME }).click();

    await expect(page.getByText(/Update ready/i)).toBeVisible();
    await page.getByRole("button", { name: "Refresh now" }).click();

    await expect
      .poll(() => page.evaluate(() => window.__updateUiTest.refreshCalls))
      .toBe(1);
  });

  test("cache recovery action remains available from settings", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => {
      window.__updateUiTest = {
        clearCalls: 0,
      };

      window.clearServiceWorkerCache = async () => {
        window.__updateUiTest.clearCalls += 1;
        return true;
      };
    });

    await page.getByRole("button", { name: SETTINGS_BUTTON_NAME }).click();
    await page.getByRole("button", { name: "Clear cache" }).click();

    await expect
      .poll(() => page.evaluate(() => window.__updateUiTest.clearCalls))
      .toBe(1);
  });
});
// @ts-check
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const GAME_URL = "/src/pages/game.html?level=beginner&preload=off";
const SETTINGS_KEY = "mathmaster_user_settings_v1";

function createSpanishSettings() {
  return {
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
  };
}

const SPANISH_SETTINGS = createSpanishSettings();

function createMutedSpanishSettings() {
  const settings = createSpanishSettings();
  settings.sound.muted = true;
  return settings;
}

test.describe("Game settings localization", () => {
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

  test("applies the persisted locale to level-select UI copy", async ({ page }) => {
    await page.addInitScript(
      ({ storageKey, value }) => {
        localStorage.setItem(storageKey, value);
      },
      {
        storageKey: SETTINGS_KEY,
        value: JSON.stringify(SPANISH_SETTINGS),
      },
    );

    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          lang: document.documentElement.lang,
          kicker: document.querySelector(".page-kicker")?.textContent?.trim(),
          subtitle: document.querySelector(".subtitle")?.textContent?.trim(),
          creatorCredit:
            document.querySelector(".creator-credit")?.textContent?.trim(),
        })),
      )
      .toMatchObject({
        lang: "es-ES",
        kicker: "Expediente de entrenamiento",
        subtitle: "Elige una ruta",
        creatorCredit: "Created by Teacher Evan",
      });
  });

  test("applies the persisted locale to onboarding copy before interaction", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ storageKey, value }) => {
        localStorage.setItem(storageKey, value);
      },
      {
        storageKey: SETTINGS_KEY,
        value: JSON.stringify(SPANISH_SETTINGS),
      },
    );

    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

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

  test("boot applies settings before onboarding locale becomes interactive", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ storageKey, value }) => {
        localStorage.setItem(storageKey, value);
      },
      {
        storageKey: SETTINGS_KEY,
        value: JSON.stringify(SPANISH_SETTINGS),
      },
    );

    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const modal = document.getElementById("how-to-play-modal");
          const startButton = document.getElementById("start-game-btn");

          return {
            modalVisible: modal ? getComputedStyle(modal).display === "flex" : false,
            lang: document.documentElement.lang,
            title: document.getElementById("how-to-play-title")?.textContent?.trim(),
            button: startButton?.textContent?.trim(),
            startFocused: document.activeElement === startButton,
          };
        }),
      )
      .toMatchObject({
        modalVisible: true,
        lang: "es-ES",
        title: "Desbloquea tu mente",
        button: "Comenzar calibración",
        startFocused: true,
      });
  });

  test("boot applies settings to muted audio before onboarding becomes interactive", async ({
    page,
  }) => {
    await page.addInitScript(
      ({ storageKey, value }) => {
        localStorage.setItem(storageKey, value);
      },
      {
        storageKey: SETTINGS_KEY,
        value: JSON.stringify(createMutedSpanishSettings()),
      },
    );

    await page.goto(GAME_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => {
          const modal = document.getElementById("how-to-play-modal");

          return {
            modalVisible: modal ? getComputedStyle(modal).display === "flex" : false,
            muted: window.CyberpunkInteractionAudio?.isMuted === true,
            audioLabel:
              document.querySelector("#audio-toggle .audio-toggle__label")?.textContent?.trim() || null,
          };
        }),
      )
      .toMatchObject({
        modalVisible: true,
        muted: true,
        audioLabel: "Sound off",
      });
  });
});
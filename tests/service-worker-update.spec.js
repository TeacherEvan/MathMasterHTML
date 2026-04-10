// @ts-check
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";

async function runServiceWorkerScenario(scenario) {
  const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

  const listeners = new Map();
  const openedCaches = [];
  const deletedCaches = [];
  const cachedAssets = [];
  const messageResponses = [];
  const initialCacheNames = [
    "math-master-static-legacy",
    "math-master-runtime-legacy",
    "third-party-cache",
  ];

  const fakeCaches = {
    async open(cacheName) {
      openedCaches.push(cacheName);
      return {
        async add(assetPath) {
          cachedAssets.push(assetPath);
        },
        async put() {},
        async match() {
          return null;
        },
      };
    },
    async keys() {
      return [...initialCacheNames];
    },
    async delete(cacheName) {
      deletedCaches.push(cacheName);
      return true;
    },
  };

  const selfScope = {
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    skipWaitingCalls: 0,
    skipWaiting() {
      selfScope.skipWaitingCalls += 1;
      return Promise.resolve();
    },
    clients: {
      claimCalls: 0,
      claim() {
        selfScope.clients.claimCalls += 1;
        return Promise.resolve();
      },
      openWindow() {
        return Promise.resolve();
      },
    },
    registration: {
      showNotification() {
        return Promise.resolve();
      },
    },
  };

  const context = vm.createContext({
    self: selfScope,
    caches: fakeCaches,
    fetch: async () => new Response("ok", { status: 200 }),
    location: { origin: "https://example.test" },
    URL,
    Response,
    console: {
      log() {},
      warn() {},
      error() {},
    },
    Promise,
    setTimeout,
    clearTimeout,
    clients: selfScope.clients,
  });

  vm.runInContext(source, context);

  if (scenario === "install-activate") {
    const installEvent = {
      waitUntil(promise) {
        this.promise = Promise.resolve(promise);
      },
    };
    listeners.get("install")?.(installEvent);
    await installEvent.promise;

    const activateEvent = {
      waitUntil(promise) {
        this.promise = Promise.resolve(promise);
      },
    };
    listeners.get("activate")?.(activateEvent);
    await activateEvent.promise;

    return {
      openedCaches,
      cachedAssetsCount: cachedAssets.length,
      deletedCaches,
      skipWaitingCalls: selfScope.skipWaitingCalls,
      claimCalls: selfScope.clients.claimCalls,
    };
  }

  if (scenario === "clear-cache-message") {
    const messageEvent = {
      data: {
        type: "CLEAR_CACHE",
      },
      ports: [
        {
          postMessage(message) {
            messageResponses.push(message);
          },
        },
      ],
      waitUntil(promise) {
        this.promise = Promise.resolve(promise);
      },
    };

    listeners.get("message")?.(messageEvent);
    await messageEvent.promise;

    return {
      deletedCaches,
      messageResponses,
    };
  }

  return null;
}

test.describe("Service worker update flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const postedMessages = [];
      const registrationListeners = new Map();
      const workerListeners = new Map();

      const fakeWorker = {
        state: "installing",
        addEventListener(type, callback) {
          workerListeners.set(type, callback);
        },
        postMessage(message) {
          postedMessages.push(message);
        },
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

      const updateEvents = [];
      document.addEventListener("appUpdateAvailable", (event) => {
        updateEvents.push(event.detail || null);
      });

      window.__swUpdateTest = {
        postedMessages,
        updateEvents,
        isRegistrationReady() {
          return registrationListeners.has("updatefound");
        },
        triggerUpdateFound() {
          registrationListeners.get("updatefound")?.();
        },
        triggerInstalled() {
          fakeWorker.state = "installed";
          workerListeners.get("statechange")?.();
        },
      };

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
  });

  test("exposes a shared build version on the page runtime", async ({ page }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          value: window.MathMasterBuildVersion,
          type: typeof window.MathMasterBuildVersion,
        })),
      )
      .toEqual({
        value: expect.any(String),
        type: "string",
      });
  });

  test("publishes update availability without immediately activating the new worker", async ({
    page,
  }) => {
    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    await expect
      .poll(() =>
        page.evaluate(() => window.__swUpdateTest.isRegistrationReady()),
      )
      .toBe(true);

    await page.evaluate(() => {
      window.__swUpdateTest.triggerUpdateFound();
      window.__swUpdateTest.triggerInstalled();
    });

    await expect
      .poll(() =>
        page.evaluate(() => ({
          updateEvents: window.__swUpdateTest.updateEvents.length,
          postedMessages: window.__swUpdateTest.postedMessages.map(
            (message) => message?.type || null,
          ),
        })),
      )
      .toEqual({
        updateEvents: 1,
        postedMessages: [],
      });
  });

  test("worker install leaves the new version waiting and activate cleanup is Math Master scoped", async ({
    page,
  }) => {
    const state = await runServiceWorkerScenario("install-activate");

    expect(state.cachedAssetsCount).toBeGreaterThan(0);
    expect(state.openedCaches[0]).toContain("math-master-");
    expect(state.skipWaitingCalls).toBe(0);
    expect(state.claimCalls).toBe(1);
    expect(state.deletedCaches).toEqual([
      "math-master-static-legacy",
      "math-master-runtime-legacy",
    ]);
  });

  test("worker cache recovery clears only Math Master caches", async ({ page }) => {
    const state = await runServiceWorkerScenario("clear-cache-message");

    expect(state.deletedCaches).toEqual([
      "math-master-static-legacy",
      "math-master-runtime-legacy",
    ]);
    expect(state.messageResponses).toEqual([{ success: true }]);
  });
});
// @ts-check
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { expect, test } from "@playwright/test";

const LEVEL_SELECT_URL = "/src/pages/level-select.html";
const PAGE_HTML_BY_PATH = new Map([
  [
    "/src/pages/index.html",
    `
      <link rel="stylesheet" href="/src/styles/css/index.css">
      <script src="/src/scripts/index-page.js"></script>
    `,
  ],
  [
    "/src/pages/level-select.html",
    `
      <link rel="stylesheet" href="/src/styles/css/level-select.css">
      <script src="/src/scripts/level-select-page.js"></script>
    `,
  ],
  [
    "/src/pages/game.html",
    `
      <link rel="stylesheet" href="/src/styles/css/game.css?v=20260422-local-freshness-evan-audio-1">
      <link rel="stylesheet" href="/src/styles/css/game-modals.preload.css?v=20260422-local-freshness-evan-audio-1">
      <script src="/src/scripts/game.js"></script>
      <script src="/src/scripts/game-page.js?v=20260422-local-freshness-evan-audio-1"></script>
    `,
  ],
]);

function getCacheKey(input) {
  const requestUrl = typeof input === "string" ? input : input?.url || "";
  const url = new URL(requestUrl, "https://example.test");
  return `${url.pathname}${url.search}`;
}

async function runServiceWorkerScenario(scenario) {
  const source = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");

  const listeners = new Map();
  const openedCaches = [];
  const deletedCaches = [];
  const cachedAssets = [];
  const messageResponses = [];
  const cacheEntries = new Map();
  const shownNotifications = [];
  const openedWindows = [];
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
          cacheEntries.set(assetPath, new Response("cached", { status: 200 }));
        },
        async put(request, response) {
          cacheEntries.set(getCacheKey(request), response.clone());
        },
        async match(request) {
          return cacheEntries.get(getCacheKey(request)) || null;
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
      openWindow(url) {
        openedWindows.push(url);
        return Promise.resolve();
      },
    },
    registration: {
      showNotification(title, options) {
        shownNotifications.push({ title, options });
        return Promise.resolve();
      },
    },
  };

  const context = vm.createContext({
    self: selfScope,
    caches: fakeCaches,
    fetch: async (input) => {
      const requestUrl = typeof input === "string" ? input : input?.url || "";
      const url = new URL(requestUrl, "https://example.test");
      const pageHtml = PAGE_HTML_BY_PATH.get(url.pathname);
      if (pageHtml) {
        return new Response(pageHtml, { status: 200 });
      }

      return new Response("ok", { status: 200 });
    },
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
      cachedAssets,
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

  if (scenario === "versioned-cache-fallback") {
    cacheEntries.set(
      "/src/styles/css/game.css",
      new Response("cached-style", { status: 200 }),
    );

    context.fetch = async (input) => {
      const requestUrl = typeof input === "string" ? input : input?.url || "";
      const url = new URL(requestUrl, "https://example.test");
      if (url.pathname === "/src/styles/css/game.css") {
        throw new Error("offline");
      }

      const pageHtml = PAGE_HTML_BY_PATH.get(url.pathname);
      if (pageHtml) {
        return new Response(pageHtml, { status: 200 });
      }

      return new Response("ok", { status: 200 });
    };

    const fetchEvent = {
      request: new Request(
        "https://example.test/src/styles/css/game.css?v=20260422-local-freshness-evan-audio-1",
      ),
      respondWith(promise) {
        this.promise = Promise.resolve(promise);
      },
    };

    listeners.get("fetch")?.(fetchEvent);
    const response = await fetchEvent.promise;

    return {
      body: await response.text(),
      status: response.status,
    };
  }

  if (scenario === "push-invalid-json") {
    const pushEvent = {
      data: {
        json() {
          throw new Error("invalid json");
        },
      },
      waitUntil(promise) {
        this.promise = Promise.resolve(promise);
      },
    };

    listeners.get("push")?.(pushEvent);
    await pushEvent.promise;

    return {
      shownNotifications,
    };
  }

  if (scenario === "notificationclick-foreign-url") {
    const notificationEvent = {
      notification: {
        closeCalls: 0,
        close() {
          this.closeCalls += 1;
        },
        data: {
          url: "https://evil.example/phish?x=1",
        },
      },
      waitUntil(promise) {
        this.promise = Promise.resolve(promise);
      },
    };

    listeners.get("notificationclick")?.(notificationEvent);
    await notificationEvent.promise;

    return {
      closeCalls: notificationEvent.notification.closeCalls,
      openedWindows,
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
    expect(state.cachedAssets).toContain("/src/scripts/game-init.js");
    expect(state.cachedAssets).toContain("/src/scripts/game-state-manager.js");
    expect(state.cachedAssets).toContain("/src/styles/css/game.css");
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

  test("versioned asset requests fall back to matching unversioned cached entries", async ({
    page,
  }) => {
    const state = await runServiceWorkerScenario("versioned-cache-fallback");

    expect(state).toEqual({
      body: "cached-style",
      status: 200,
    });
  });

  test("push notifications fall back to defaults when payload JSON is invalid", async ({
    page,
  }) => {
    const state = await runServiceWorkerScenario("push-invalid-json");

    expect(state.shownNotifications).toEqual([
      {
        title: "Math Master",
        options: expect.objectContaining({
          body: "You have a new notification",
          data: {},
        }),
      },
    ]);
  });

  test("notification clicks ignore off-origin target URLs", async ({ page }) => {
    const state = await runServiceWorkerScenario("notificationclick-foreign-url");

    expect(state).toEqual({
      closeCalls: 1,
      openedWindows: ["/"],
    });
  });

  test("local build changes clear Math Master state before registering the next worker", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const deletedCaches = [];
      let unregisterCalls = 0;

      localStorage.setItem("mathmaster_build_version_v1", "older-build");
      localStorage.setItem("mathmaster_onboarding_v1", JSON.stringify({ stale: true }));
      localStorage.setItem("mathmaster_console_beginner", JSON.stringify(["x"]));
      localStorage.setItem("third-party-key", "keep");

      Object.defineProperty(window, "caches", {
        configurable: true,
        value: {
          async keys() {
            return [
              "math-master-static-legacy",
              "math-master-runtime-legacy",
              "third-party-cache",
            ];
          },
          async delete(cacheName) {
            deletedCaches.push(cacheName);
            return true;
          },
        },
      });

      const fakeRegistration = {
        scope: "/",
        waiting: null,
        installing: null,
        active: {},
        addEventListener() {},
        async update() {},
        async unregister() {
          unregisterCalls += 1;
          return true;
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
          async getRegistrations() {
            return [fakeRegistration];
          },
          addEventListener() {},
        },
      });

      window.__branchFreshness = {
        deletedCaches,
        get unregisterCalls() {
          return unregisterCalls;
        },
      };
    });

    await page.goto(LEVEL_SELECT_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    await expect
      .poll(() =>
        page.evaluate(() => ({
          buildVersion: localStorage.getItem("mathmaster_build_version_v1"),
          onboarding: localStorage.getItem("mathmaster_onboarding_v1"),
          consoleState: localStorage.getItem("mathmaster_console_beginner"),
          thirdParty: localStorage.getItem("third-party-key"),
          deletedCaches: window.__branchFreshness.deletedCaches.slice(),
          unregisterCalls: window.__branchFreshness.unregisterCalls,
          runtimeBuildVersion: window.MathMasterBuildVersion,
        })),
      )
      .toEqual({
        buildVersion: expect.any(String),
        onboarding: null,
        consoleState: null,
        thirdParty: "keep",
        deletedCaches: [
          "math-master-static-legacy",
          "math-master-runtime-legacy",
        ],
        unregisterCalls: 1,
        runtimeBuildVersion: expect.any(String),
      });
  });
});
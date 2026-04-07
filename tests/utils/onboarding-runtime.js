const GAME_RUNTIME_PATH = "/game.html";
const ONBOARDING_STORAGE_KEY = "mathmaster_onboarding_v1";
const NAVIGATION_RETRY_COUNT = 3;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSearch(search) {
  if (!search) return "";
  return search.startsWith("?") ? search : `?${search}`;
}

function getRuntimeUrl(search = "") {
  const params = new URLSearchParams(normalizeSearch(search).slice(1));

  if (!params.has("case")) {
    params.set("case", `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  }

  return `${GAME_RUNTIME_PATH}?${params.toString()}`;
}

function createInitScriptRunKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function gotoRuntimeWithRetry(page, url) {
  let lastError = null;

  for (let attempt = 0; attempt < NAVIGATION_RETRY_COUNT; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === NAVIGATION_RETRY_COUNT - 1) {
        throw lastError;
      }
      if (page.isClosed()) {
        throw lastError;
      }
      await delay(500);
    }
  }
}

export async function waitForOnboardingRuntime(page) {
  await page.waitForFunction(
    () => {
      return Boolean(
        window.GameEvents &&
        window.GameOnboarding &&
        window.GameOnboardingStorage &&
        window.StartupPreload,
      );
    },
    { timeout: 10000 },
  );
}

export async function waitForRuntimeCoordinator(page) {
  await page.waitForFunction(
    () => Boolean(window.GameRuntimeCoordinator),
    { timeout: 10000 },
  );
}

export async function waitForGameplayReady(page) {
  await waitForRuntimeCoordinator(page);
  await page.waitForFunction(
    () => window.GameRuntimeCoordinator?.isGameplayReady?.() === true,
    { timeout: 10000 },
  );
}

export async function waitForInteractiveGameplay(page) {
  await waitForGameplayReady(page);
  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      const modalHidden =
        !modal || window.getComputedStyle(modal).display === "none";

      return Boolean(
        modalHidden &&
          window.GameInit &&
          window.GameProblemManager &&
          window.GameSymbolHandlerCore &&
          document.querySelectorAll(".hidden-symbol").length > 0,
      );
    },
    { timeout: 15000 },
  );
}

export async function waitForGameplayInputReady(page) {
  await waitForInteractiveGameplay(page);
  await page.waitForFunction(
    () => window.GameRuntimeCoordinator?.canAcceptGameplayInput?.() !== false,
    { timeout: 15000 },
  );
}

export async function stopEvanHelpIfActive(page) {
  const skipVisible = await page
    .locator("#evan-skip-button")
    .isVisible()
    .catch(() => false);

  if (!skipVisible) {
    return;
  }

  await page.evaluate(() => {
    document.getElementById("evan-skip-button")?.click();
  });

  await page.waitForFunction(
    () => {
      const coordinator = window.GameRuntimeCoordinator;
      const skipButton = document.getElementById("evan-skip-button");
      const skipHidden =
        !skipButton || window.getComputedStyle(skipButton).display === "none";

      if (coordinator?.canAcceptGameplayInput) {
        return coordinator.canAcceptGameplayInput() && skipHidden;
      }

      return skipHidden;
    },
    { timeout: 15000 },
  );
}

export async function dismissBriefingAndWaitForInteractiveGameplay(page) {
  await page.waitForSelector("#start-game-btn", {
    state: "visible",
    timeout: 10000,
  });

  await page.evaluate(() => {
    document.getElementById("start-game-btn")?.click();
  });

  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      return !modal || window.getComputedStyle(modal).display === "none";
    },
    { timeout: 10000 },
  );

  await waitForInteractiveGameplay(page);
}

export async function gotoGameRuntime(page, search = "") {
  await gotoRuntimeWithRetry(page, getRuntimeUrl(search));
  await waitForOnboardingRuntime(page);
}

export async function resetOnboardingState(page, search = "?level=beginner") {
  await page.addInitScript(
    ({ storageKey, runKey }) => {
      if (sessionStorage.getItem(runKey)) {
        return;
      }

      localStorage.removeItem(storageKey);
      sessionStorage.setItem(runKey, "1");
    },
    {
      storageKey: ONBOARDING_STORAGE_KEY,
      runKey: createInitScriptRunKey("onboarding-reset"),
    },
  );
  await gotoGameRuntime(page, search);
}

export async function seedOnboardingState(
  page,
  state,
  search = "?level=beginner",
) {
  await page.addInitScript(
    ({ storageKey, value, runKey }) => {
      if (sessionStorage.getItem(runKey)) {
        return;
      }

      localStorage.setItem(storageKey, value);
      sessionStorage.setItem(runKey, "1");
    },
    {
      storageKey: ONBOARDING_STORAGE_KEY,
      value: JSON.stringify(state),
      runKey: createInitScriptRunKey("onboarding-seed"),
    },
  );
  await gotoGameRuntime(page, search);
}

export async function setCorruptOnboardingState(
  page,
  rawValue = "CORRUPT{{{DATA",
  search = "?level=beginner",
) {
  await page.addInitScript(
    ({ storageKey, value, runKey }) => {
      if (sessionStorage.getItem(runKey)) {
        return;
      }

      localStorage.setItem(storageKey, value);
      sessionStorage.setItem(runKey, "1");
    },
    {
      storageKey: ONBOARDING_STORAGE_KEY,
      value: rawValue,
      runKey: createInitScriptRunKey("onboarding-corrupt"),
    },
  );
  await gotoGameRuntime(page, search);
}

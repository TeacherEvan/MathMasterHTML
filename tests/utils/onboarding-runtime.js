const GAME_RUNTIME_PATH = "/src/pages/game.html";
const ONBOARDING_STORAGE_KEY = "mathmaster_onboarding_v1";
const NAVIGATION_RETRY_COUNT = 3;

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

async function gotoRuntimeWithRetry(page, url) {
  let lastError = null;

  for (let attempt = 0; attempt < NAVIGATION_RETRY_COUNT; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: "commit",
        timeout: 10000,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === NAVIGATION_RETRY_COUNT - 1) {
        throw lastError;
      }
      await page.waitForTimeout(500);
    }
  }
}

export async function waitForOnboardingRuntime(page) {
  await page.waitForFunction(
    () => {
      return Boolean(
        window.GameEvents &&
        window.GameOnboarding &&
        window.GameOnboardingStorage,
      );
    },
    { timeout: 10000 },
  );
}

export async function gotoGameRuntime(page, search = "") {
  await gotoRuntimeWithRetry(page, getRuntimeUrl(search));
  await waitForOnboardingRuntime(page);
}

export async function resetOnboardingState(page, search = "?level=beginner") {
  await gotoGameRuntime(page, search);
  await page.evaluate((storageKey) => {
    localStorage.removeItem(storageKey);
  }, ONBOARDING_STORAGE_KEY);
  await gotoGameRuntime(page, search);
}

export async function seedOnboardingState(
  page,
  state,
  search = "?level=beginner",
) {
  await gotoGameRuntime(page, search);
  await page.evaluate(
    ({ storageKey, value }) => {
      localStorage.setItem(storageKey, JSON.stringify(value));
    },
    { storageKey: ONBOARDING_STORAGE_KEY, value: state },
  );
  await gotoGameRuntime(page, search);
}

export async function setCorruptOnboardingState(
  page,
  rawValue = "CORRUPT{{{DATA",
  search = "?level=beginner",
) {
  await gotoGameRuntime(page, search);
  await page.evaluate(
    ({ storageKey, value }) => {
      localStorage.setItem(storageKey, value);
    },
    { storageKey: ONBOARDING_STORAGE_KEY, value: rawValue },
  );
  await gotoGameRuntime(page, search);
}

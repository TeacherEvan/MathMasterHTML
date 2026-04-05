import { firefox } from "@playwright/test";

const browser = await firefox.launch();
const page = await browser.newPage();
const requests = [];
const pending = new Map();

page.on("request", (request) => {
  pending.set(request.url(), {
    url: request.url(),
    resourceType: request.resourceType(),
    method: request.method(),
  });
});

page.on("requestfinished", (request) => {
  pending.delete(request.url());
  requests.push({
    url: request.url(),
    resourceType: request.resourceType(),
    status: "finished",
  });
});

page.on("requestfailed", (request) => {
  pending.delete(request.url());
  requests.push({
    url: request.url(),
    resourceType: request.resourceType(),
    status: "failed",
    failure: request.failure()?.errorText ?? null,
  });
});

let gotoError = null;
try {
  await page.goto("http://localhost:8000/game.html?level=beginner", {
    waitUntil: "load",
    timeout: 15000,
  });
} catch (error) {
  gotoError = {
    message: error.message,
    name: error.name,
  };
}

const snapshot = await page.evaluate(() => {
  const entries = performance
    .getEntriesByType("resource")
    .map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      duration: entry.duration,
      responseEnd: entry.responseEnd,
    }))
    .slice(-40);

  return {
    href: window.location.href,
    readyState: document.readyState,
    title: document.title,
    startButtonExists: Boolean(document.getElementById("start-game-btn")),
    bodyChildren: document.body.children.length,
    resourceEntries: entries,
  };
});

console.log(
  JSON.stringify(
    {
      gotoError,
      snapshot,
      pending: Array.from(pending.values()),
      recentRequests: requests.slice(-40),
    },
    null,
    2,
  ),
);

await browser.close();

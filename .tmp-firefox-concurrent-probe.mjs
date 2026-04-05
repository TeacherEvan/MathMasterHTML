import { firefox } from "@playwright/test";

const browser = await firefox.launch();
const pageA = await browser.newPage();
const pageB = await browser.newPage();

async function nav(page, label) {
  const startedAt = Date.now();
  try {
    await page.goto("http://localhost:8000/game.html?level=beginner", {
      waitUntil: "load",
      timeout: 30000,
    });
    return {
      label,
      ok: true,
      durationMs: Date.now() - startedAt,
      finalUrl: page.url(),
      readyState: await page.evaluate(() => document.readyState),
    };
  } catch (error) {
    return {
      label,
      ok: false,
      durationMs: Date.now() - startedAt,
      finalUrl: page.url(),
      message: error.message,
    };
  }
}

const results = await Promise.all([nav(pageA, "A"), nav(pageB, "B")]);
console.log(JSON.stringify(results, null, 2));

await browser.close();

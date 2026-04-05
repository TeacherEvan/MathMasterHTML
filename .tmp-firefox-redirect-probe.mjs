import { firefox } from "@playwright/test";

const browser = await firefox.launch();
const urls = [
  "http://localhost:8000/game.html?level=beginner",
  "http://localhost:8000/src/pages/game.html?level=beginner",
];

const results = [];

for (const url of urls) {
  for (let i = 0; i < 4; i += 1) {
    const page = await browser.newPage();
    const startedAt = Date.now();
    try {
      await page.goto(url, { waitUntil: "load", timeout: 15000 });
      results.push({
        url,
        run: i + 1,
        ok: true,
        durationMs: Date.now() - startedAt,
        finalUrl: page.url(),
        readyState: await page.evaluate(() => document.readyState),
      });
    } catch (error) {
      results.push({
        url,
        run: i + 1,
        ok: false,
        durationMs: Date.now() - startedAt,
        finalUrl: page.url(),
        message: error.message,
      });
    }
    await page.close();
  }
}

console.log(JSON.stringify(results, null, 2));
await browser.close();

import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
await page.goto('http://localhost:8000/game.html?level=beginner', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#start-game-btn', { state: 'visible', timeout: 10000 });
await page.locator('#start-game-btn').click({ force: true });
await page.waitForTimeout(500);
const data = await page.evaluate(() => {
  const box = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      display: window.getComputedStyle(el).display,
    };
  };
  return {
    overlayDisplay: window.getComputedStyle(document.getElementById('rotation-overlay')).display,
    problem: box('#problem-container'),
    lock: box('#lock-display'),
    modalDisplay: document.getElementById('how-to-play-modal')?.style.display ?? null,
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();

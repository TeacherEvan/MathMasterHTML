import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['Desktop Chrome'],
});
const page = await context.newPage();

await page.goto('http://localhost:8000/game.html?level=beginner', {
  waitUntil: 'domcontentloaded',
});
await page.waitForSelector('#start-game-btn', { state: 'visible', timeout: 10000 });
await page.locator('#start-game-btn').click({ force: true });
await page.waitForTimeout(500);

const data = await page.evaluate(() => {
  const measure = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      display: window.getComputedStyle(element).display,
    };
  };

  return {
    href: window.location.href,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    bodyClass: document.body.className,
    overlayDisplay: window.getComputedStyle(document.getElementById('rotation-overlay')).display,
    gridDisplay: window.getComputedStyle(document.querySelector('.grid-container')).display,
    score: measure('#score-display'),
    problem: measure('#problem-container'),
    lock: measure('#lock-display'),
    panelA: measure('#panel-a'),
    panelB: measure('#panel-b'),
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();

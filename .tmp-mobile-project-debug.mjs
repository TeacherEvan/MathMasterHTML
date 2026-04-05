import { chromium, webkit, devices } from '@playwright/test';

async function inspect(label, launcher, deviceName) {
  const browser = await launcher.launch();
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();
  await page.goto('http://localhost:8000/game.html?level=beginner', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#start-game-btn', { state: 'visible', timeout: 10000 });
  await page.locator('#start-game-btn').click({ force: true });
  await page.waitForTimeout(700);
  const data = await page.evaluate(() => {
    const box = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        display: window.getComputedStyle(el).display,
      };
    };
    return {
      href: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bodyClass: document.body.className,
      overlayDisplay: window.getComputedStyle(document.getElementById('rotation-overlay')).display,
      gridDisplay: window.getComputedStyle(document.querySelector('.grid-container')).display,
      backButtonDisplay: window.getComputedStyle(document.getElementById('back-button')).display,
      problem: box('#problem-container'),
      lock: box('#lock-display'),
      powerUpDisplay: box('#power-up-display'),
    };
  });
  console.log(`\n=== ${label} (${deviceName}) ===`);
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
}

await inspect('chromium-mobile', chromium, 'Pixel 7');
await inspect('webkit-mobile', webkit, 'iPhone 13');

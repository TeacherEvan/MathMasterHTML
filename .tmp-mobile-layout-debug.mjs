import { chromium, devices } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['Pixel 7'],
  viewport: { width: 915, height: 540 },
  screen: { width: 915, height: 540 },
});
const page = await context.newPage();

await page.goto('http://localhost:8000/src/pages/game.html?level=beginner', {
  waitUntil: 'domcontentloaded',
});

const startButton = page.locator('#start-game-btn');
if (await startButton.isVisible()) {
  await startButton.click({ force: true });
}

await page.waitForTimeout(1000);

const data = await page.evaluate(() => {
  const measure = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      selector,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
      gridColumn: `${style.gridColumnStart} / ${style.gridColumnEnd}`,
      gridRow: `${style.gridRowStart} / ${style.gridRowEnd}`,
      position: style.position,
      marginTop: style.marginTop,
      display: style.display,
    };
  };

  const grid = document.querySelector('.grid-container');
  const gridStyle = grid ? window.getComputedStyle(grid) : null;

  return {
    bodyClass: document.body.className,
    activeResolution: window.displayManager?.getCurrentResolution?.(),
    grid: gridStyle
      ? {
          display: gridStyle.display,
          gridTemplateColumns: gridStyle.gridTemplateColumns,
          gridTemplateRows: gridStyle.gridTemplateRows,
          height: gridStyle.height,
        }
      : null,
    panelA: measure('#panel-a'),
    panelB: measure('#panel-b'),
    panelC: measure('#panel-c'),
    walls: Array.from(document.querySelectorAll('.grid-container > .wall')).map((wall, index) => {
      const rect = wall.getBoundingClientRect();
      const style = window.getComputedStyle(wall);
      return {
        index,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        gridColumn: `${style.gridColumnStart} / ${style.gridColumnEnd}`,
        gridRow: `${style.gridRowStart} / ${style.gridRowEnd}`,
        display: style.display,
      };
    }),
  };
});

console.log(JSON.stringify(data, null, 2));
await browser.close();

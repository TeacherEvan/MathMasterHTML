import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
await page.goto('http://localhost:8000/level-select.html?level-debug=narrow', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(600);
const data = await page.evaluate(() => {
  const pick = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      selector,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
      display: style.display,
      textAlign: style.textAlign,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      gap: style.gap,
      fontSize: style.fontSize,
      gridTemplateColumns: style.gridTemplateColumns,
    };
  };
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    header: pick('.header'),
    headerHint: pick('.header-hint'),
    levelsGrid: pick('.levels-grid'),
    beginner: pick('.level-card[data-level="beginner"]'),
    warrior: pick('.level-card[data-level="warrior"]'),
    master: pick('.level-card[data-level="master"]'),
    nav: pick('.navigation'),
    back: pick('.back-button'),
    reset: pick('.reset-progress-btn')
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
process.exit(0);

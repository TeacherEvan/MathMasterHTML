import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1024 } });
await page.goto('http://localhost:8000/index.html?welcome-debug=1', { waitUntil: 'domcontentloaded' });
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
      textAlign: style.textAlign,
      display: style.display,
      justifyContent: style.justifyContent,
      alignItems: style.alignItems,
      fontSize: style.fontSize,
      opacity: style.opacity,
      transform: style.transform,
      marginTop: style.marginTop,
      gap: style.gap,
    };
  };
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    header: pick('.welcome-header'),
    main: pick('.welcome-container'),
    logoContainer: pick('.logo-container'),
    logoCircle: pick('.logo-circle'),
    logoContent: pick('.logo-content'),
    logoSymbol: pick('.logo-symbol'),
    logoVariables: pick('.logo-variables'),
    quote: pick('.quote'),
    buttons: pick('.button-container'),
    hint: pick('.welcome-hint'),
    credit: pick('.creator-credit'),
    scoreboardButton: pick('#scoreboard-button'),
    cta: pick('#begin-training-button'),
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
process.exit(0);

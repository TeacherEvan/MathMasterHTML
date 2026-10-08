import { test, expect } from '@playwright/test';

test.describe('HUD Console Mobile Viewport', () => {
  const viewports = [
    { name: 'mobile-portrait', width: 375, height: 667 },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
  ];

  for (const vp of viewports) {
    test(`HUD and console positioning - ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/src/pages/game.html?level=beginner');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Dismiss onboarding
      const startBtn = page.locator('#start-game-btn');
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(500);
      }

      // Get viewport classes
      const bodyClasses = await page.locator('body').getAttribute('class');
      console.log(`${vp.name} body classes:`, bodyClasses);

      // Check HUD position
      const hud = page.locator('.game-hud');
      const hudBox = await hud.boundingBox();
      console.log(`${vp.name} HUD:`, hudBox);

      // Check Panel A
      const panelA = page.locator('#panel-a');
      const panelABox = await panelA.boundingBox();
      console.log(`${vp.name} Panel A:`, panelABox);

      // Check symbol console
      const symbolConsole = page.locator('#symbol-console');
      const consoleBox = await symbolConsole.boundingBox();
      console.log(`${vp.name} Symbol Console:`, consoleBox);

      // Check lock display
      const lock = page.locator('#lock-display');
      const lockBox = await lock.boundingBox();
      console.log(`${vp.name} Lock:`, lockBox);

      // Check problem container
      const problem = page.locator('#problem-container');
      const problemBox = await problem.boundingBox();
      console.log(`${vp.name} Problem:`, problemBox);

      // Verify no HUD overlap with Panel A content (problem container is first actual content)
      if (hudBox && problemBox) {
        const hudBottom = hudBox.y + hudBox.height;
        const problemTop = problemBox.y;
        if (hudBottom > problemTop) {
          console.log(`⚠️ ${vp.name}: HUD overlaps problem container! HUD bottom: ${hudBottom}, Problem top: ${problemTop}`);
        } else {
          console.log(`✅ ${vp.name}: HUD clear of problem container`);
        }
      }

      // Verify symbol console visible and not overlapped
      if (consoleBox && lockBox) {
        const consoleTop = consoleBox.y;
        const lockBottom = lockBox.y + lockBox.height;
        if (consoleTop < lockBottom) {
          console.log(`⚠️ ${vp.name}: Console overlaps lock! Console top: ${consoleTop}, Lock bottom: ${lockBottom}`);
        } else {
          console.log(`✅ ${vp.name}: Console clear of lock`);
        }
      }

      // Take screenshot for visual verification
      await page.screenshot({ path: `/tmp/hud-mobile-${vp.name}.png`, fullPage: true });
    });
  }
});
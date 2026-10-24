import { test, expect } from '@playwright/test';

test('Victory banner does not overlap lock display', async ({ page }) => {
  await page.goto('/src/pages/game.html?level=beginner');
  await page.waitForLoadState('networkidle');

  // Wait for game to initialize
  await page.waitForTimeout(3000);

  // Check that lock display exists and is visible
  const lockDisplay = page.locator('#lock-display');
  await expect(lockDisplay).toBeVisible();

  // The banner is created on demand by the runtime. Add one and pin it to
  // the steady, fully visible state of its entrance animation so the
  // measurement is deterministic and independent of the viewport
  // breakpoints that reposition it.
  await page.evaluate(() => {
    const banner = document.createElement('div');
    banner.className = 'victory-banner';
    banner.innerHTML = '<span class="victory-text">LINE 1 COMPLETE!</span>';
    banner.style.animation = 'none';
    banner.style.transform = 'translate(-50%, -50%) scale(1)';
    banner.style.opacity = '1';
    document.body.appendChild(banner);
  });

  const banner = page.locator('.victory-banner');
  await expect(banner).toBeAttached();

  const [bannerBox, lockBox] = await Promise.all([
    banner.boundingBox(),
    lockDisplay.boundingBox(),
  ]);

  expect(bannerBox).not.toBeNull();
  expect(lockBox).not.toBeNull();

  const resolvedBannerBox = /** @type {{ x: number; y: number; width: number; height: number }} */ (bannerBox);
  const resolvedLockBox = /** @type {{ x: number; y: number; width: number; height: number }} */ (lockBox);

  // The banner is anchored near the top of the viewport, so it must stay
  // fully on screen and clear of the lock display below it. It used to be
  // compared against a hardcoded 85px offset, which only ever matched the
  // desktop breakpoint - the responsive rules move the banner up to
  // 60px/70px, so the constant no longer described the real layout.
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(resolvedBannerBox.y).toBeGreaterThanOrEqual(0);
  expect(resolvedBannerBox.y + resolvedBannerBox.height).toBeLessThanOrEqual(
    viewport.height,
  );
  expect(resolvedBannerBox.y + resolvedBannerBox.height).toBeLessThanOrEqual(
    resolvedLockBox.y,
  );
});

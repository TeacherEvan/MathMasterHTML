import { test, expect } from '@playwright/test';

test.describe('Evan Pulse - Target Highlight', () => {
  test('EvanPulse module loads and exposes setTarget/clearTarget', async ({ page }) => {
    await page.goto('/src/pages/game.html?level=beginner&evan=force&preload=off');
    await page.waitForLoadState('networkidle');
    
    const hasEvanPulse = await page.evaluate(() => !!window.EvanPulse);
    expect(hasEvanPulse).toBe(true);
    
    const hasSetTarget = await page.evaluate(() => typeof window.EvanPulse?.setTarget === 'function');
    expect(hasSetTarget).toBe(true);
    
    const hasClearTarget = await page.evaluate(() => typeof window.EvanPulse?.clearTarget === 'function');
    expect(hasClearTarget).toBe(true);
  });

  test('EvanPulse.setTarget adds evan-pulse-target class', async ({ page }) => {
    await page.goto('/src/pages/game.html?level=beginner&evan=force&preload=off');
    await page.waitForLoadState('networkidle');
    
    // Create a test element
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'pulse-test-target';
      el.style.position = 'absolute';
      el.style.top = '100px';
      el.style.left = '100px';
      el.style.width = '50px';
      el.style.height = '50px';
      el.style.background = 'red';
      document.body.appendChild(el);
      return el;
    });
    
    // Set target via EvanPulse
    await page.evaluate(() => {
      window.EvanPulse.setTarget(document.getElementById('pulse-test-target'));
    });
    
    const hasClass = await page.evaluate(() => 
      document.getElementById('pulse-test-target').classList.contains('evan-pulse-target')
    );
    expect(hasClass).toBe(true);
  });

  test('EvanPulse.clearTarget removes evan-pulse-target class', async ({ page }) => {
    await page.goto('/src/pages/game.html?level=beginner&evan=force&preload=off');
    await page.waitForLoadState('networkidle');
    
    // Create a test element and set it as target via API
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'pulse-test-target-2';
      document.body.appendChild(el);
      window.EvanPulse.setTarget(el);
      return el;
    });
    
    // Verify class was added
    let hasClass = await page.evaluate(() => 
      document.getElementById('pulse-test-target-2').classList.contains('evan-pulse-target')
    );
    expect(hasClass).toBe(true);
    
    // Clear target via EvanPulse
    await page.evaluate(() => {
      window.EvanPulse.clearTarget();
    });
    
    hasClass = await page.evaluate(() => 
      document.getElementById('pulse-test-target-2').classList.contains('evan-pulse-target')
    );
    expect(hasClass).toBe(false);
  });

  test('EvanPresenter.moveHandTo calls EvanPulse.setTarget', async ({ page }) => {
    await page.goto('/src/pages/game.html?level=beginner&evan=force&preload=off');
    await page.waitForLoadState('networkidle');
    
    // Create a test element
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'pulse-test-target-3';
      el.style.position = 'absolute';
      el.style.top = '200px';
      el.style.left = '200px';
      el.style.width = '50px';
      el.style.height = '50px';
      document.body.appendChild(el);
      return el;
    });
    
    // Call moveHandTo with target
    await page.evaluate(() => {
      window.EvanPresenter.moveHandTo(200, 200, null, document.getElementById('pulse-test-target-3'));
    });
    
    // Wait a bit for RAF
    await page.waitForTimeout(100);
    
    const hasClass = await page.evaluate(() => 
      document.getElementById('pulse-test-target-3').classList.contains('evan-pulse-target')
    );
    expect(hasClass).toBe(true);
  });

  test('EvanPresenter.parkHand calls EvanPulse.clearTarget', async ({ page }) => {
    await page.goto('/src/pages/game.html?level=beginner&evan=force&preload=off');
    await page.waitForLoadState('networkidle');
    
    // Create a test element and set as target via presenter
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'pulse-test-target-4';
      document.body.appendChild(el);
      window.EvanPresenter.moveHandTo(100, 100, null, el);
      return el;
    });
    
    await page.waitForTimeout(100);
    
    // Verify class was added
    let hasClass = await page.evaluate(() => 
      document.getElementById('pulse-test-target-4').classList.contains('evan-pulse-target')
    );
    expect(hasClass).toBe(true);
    
    // Call parkHand
    await page.evaluate(() => {
      window.EvanPresenter.parkHand();
    });
    
    hasClass = await page.evaluate(() => 
      document.getElementById('pulse-test-target-4').classList.contains('evan-pulse-target')
    );
    expect(hasClass).toBe(false);
  });

  test('Reduced motion: static outline only', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/src/pages/game.html?level=beginner&evan=force&preload=off');
    await page.waitForLoadState('networkidle');
    
    // Create a test element
    await page.evaluate(() => {
      const el = document.createElement('div');
      el.id = 'pulse-test-target-5';
      el.style.position = 'absolute';
      el.style.top = '150px';
      el.style.left = '150px';
      el.style.width = '50px';
      el.style.height = '50px';
      document.body.appendChild(el);
      window.EvanPulse.setTarget(el);
      return el;
    });
    
    // Check static outline is applied (no animation)
    const styles = await page.evaluate(() => {
      const el = document.getElementById('pulse-test-target-5');
      const computed = window.getComputedStyle(el);
      return {
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
        boxShadow: computed.boxShadow,
        animationName: computed.animationName,
      };
    });
    
    expect(styles.outlineWidth).toMatch(/^[23]px$/); // 2px from pulse + possible global focus
    expect(styles.outlineColor).toMatch(/oklch|rgb|91.*227.*201/); // --cosmic-signal color
    expect(styles.boxShadow).toMatch(/2px|none/); // static outline fallback or none
    expect(styles.animationName).toBe('none'); // no animation in reduced motion
  });
});
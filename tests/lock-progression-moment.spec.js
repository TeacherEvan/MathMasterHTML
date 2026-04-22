// tests/lock-progression-moment.spec.js
import { expect, test } from "@playwright/test";

test.describe("Lock progression signature moment", () => {
  test("problem line completions advance beginner lock levels sequentially", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    await page.waitForFunction(() => {
      return typeof window.lockManager?.getDebugInfo === "function";
    });

    await page.evaluate(() => {
      window.lockManager.reset();
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.PROBLEM_LINE_COMPLETED, {
          detail: { line: 1 },
        }),
      );
    });

    await page.waitForFunction(() => {
      return window.lockManager?.getCurrentLevel?.() === 1;
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.PROBLEM_LINE_COMPLETED, {
          detail: { line: 2 },
        }),
      );
    });

    await page.waitForFunction(() => {
      return window.lockManager?.container?.dataset.lockLevel === "2";
    });

    const lockState = await page.evaluate(() => {
      return {
        currentLevel: window.lockManager?.getCurrentLevel?.(),
        datasetLevel: window.lockManager?.container?.dataset.lockLevel,
        completedLines: window.lockManager?.getCompletedLines?.(),
      };
    });

    expect(lockState).toMatchObject({
      currentLevel: 2,
      datasetLevel: "2",
      completedLines: 2,
    });
  });

  test("game page loads dedicated lock progression moment styles", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");

    await expect(
      page.locator('link[href="/src/styles/css/lock-progression.moment.css"]'),
    ).toHaveCount(1);
  });

  test("forceLockLevel decorates Panel A with tiered ceremony state", async ({
    page,
  }) => {
    await page.goto("/game.html?level=beginner");
    await page.waitForFunction(() => {
      return typeof window.lockManager?.forceLockLevel === "function";
    });

    await page.evaluate(() => {
      window.lockManager.forceLockLevel(3);
    });

    const display = page.locator("#lock-display");
    await expect(display).toHaveAttribute("data-lock-level", "3");
    await expect(display).toHaveAttribute("data-lock-tone", "warrior");
    await expect(display).toHaveAttribute(
      "data-lock-moment",
      /arming|surge|settled/,
    );
  });

  test("lockLevelUpdated includes tone and moment metadata", async ({
    page,
  }) => {
    await page.goto("/game.html?level=master");
    await page.waitForFunction(() => {
      return typeof window.lockManager?.forceLockLevel === "function";
    });

    const detail = await page.evaluate(() => {
      return new Promise((resolve) => {
        document.addEventListener(
          "lockLevelUpdated",
          (event) => resolve(event.detail),
          { once: true },
        );
        window.lockManager.forceLockLevel(6);
      });
    });

    expect(detail).toMatchObject({
      level: 6,
      tone: "master",
    });
    expect(["arming", "surge", "settled"]).toContain(detail.moment);
  });
});

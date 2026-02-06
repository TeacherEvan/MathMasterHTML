import { describe, expect, test } from "@playwright/test";

describe("WormNearMissUI", () => {
  test("applies near-miss UI classes and urgency", async ({ page }) => {
    await page.setContent("<div id='target' class='symbol'>X</div>");
    await page.addScriptTag({ path: "./src/scripts/worm-near-miss-ui.js" });

    await page.evaluate(() => {
      const target = document.getElementById("target");
      document.dispatchEvent(
        new CustomEvent("nearMissWarning", {
          detail: {
            wormId: "worm-1",
            targetSymbol: "X",
            targetElement: target,
            distance: 40,
            urgencyLevel: 0.5,
          },
        }),
      );
    });

    const hasTargetClass = await page.$eval("#target", (el) =>
      el.classList.contains("near-miss-target"),
    );
    const hasBodyClass = await page.evaluate(() =>
      document.body.classList.contains("near-miss-active"),
    );
    const urgency = await page.$eval("#target", (el) =>
      el.style.getPropertyValue("--urgency"),
    );

    expect(hasTargetClass).toBe(true);
    expect(hasBodyClass).toBe(true);
    expect(urgency).toBe("0.5");
  });

  test("clears near-miss UI on event", async ({ page }) => {
    await page.setContent("<div id='target' class='symbol'>X</div>");
    await page.addScriptTag({ path: "./src/scripts/worm-near-miss-ui.js" });

    await page.evaluate(() => {
      const target = document.getElementById("target");
      document.dispatchEvent(
        new CustomEvent("nearMissWarning", {
          detail: {
            wormId: "worm-1",
            targetSymbol: "X",
            targetElement: target,
            distance: 30,
            urgencyLevel: 0.8,
          },
        }),
      );

      document.dispatchEvent(new CustomEvent("nearMissCleared"));
    });

    const hasTargetClass = await page.$eval("#target", (el) =>
      el.classList.contains("near-miss-target"),
    );
    const hasBodyClass = await page.evaluate(() =>
      document.body.classList.contains("near-miss-active"),
    );

    expect(hasTargetClass).toBe(false);
    expect(hasBodyClass).toBe(false);
  });
});

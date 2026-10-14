import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

test.describe("Solution cheat protection", () => {
  test("hidden symbols are not recoverable through solution selection", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium",
      "This confidentiality contract runs on the Chromium gameplay project.",
    );

    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);

    const result = await page.evaluate(() => {
      const container = document.querySelector("#solution-container");
      if (!container) {
        return null;
      }

      const hiddenSymbols = Array.from(
        container.querySelectorAll(".hidden-symbol"),
      ).map((element) => ({
        text: String(element.textContent || "").trim(),
        userSelect: window.getComputedStyle(element).userSelect,
      }));

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(container);
      selection?.removeAllRanges();
      selection?.addRange(range);

      return {
        hiddenCount: hiddenSymbols.length,
        hiddenSymbols,
        selectedText: selection?.toString() || "",
      };
    });

    expect(result).not.toBeNull();
    expect(result.hiddenCount).toBeGreaterThan(0);
    expect(
      result.hiddenSymbols.every((entry) => entry.userSelect !== "auto"),
    ).toBe(true);
    expect(result.selectedText.replace(/\s+/g, "")).toBe("");
  });
});
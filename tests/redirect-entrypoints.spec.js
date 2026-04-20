import { expect, test } from "@playwright/test";

const redirectCases = [
  {
    name: "game entrypoint preserves query parameters and hash fragments",
    entrypoint: "/game.html?level=master&preload=off#redirect-proof",
    expected: /\/src\/pages\/game\.html\?level=master&preload=off#redirect-proof$/,
  },
  {
    name: "welcome entrypoint preserves query parameters and hash fragments",
    entrypoint: "/index.html?welcome=returning#scoreboard",
    expected: /\/src\/pages\/index\.html\?welcome=returning#scoreboard$/,
  },
  {
    name: "level-select entrypoint preserves query parameters and hash fragments",
    entrypoint: "/level-select.html?source=redirect-test#warrior",
    expected: /\/src\/pages\/level-select\.html\?source=redirect-test#warrior$/,
  },
];

test.describe("root redirect entrypoints", () => {
  for (const redirectCase of redirectCases) {
    test(redirectCase.name, async ({ page }) => {
      await page.goto(redirectCase.entrypoint, {
        waitUntil: "domcontentloaded",
      });

      await expect(page).toHaveURL(redirectCase.expected);
    });
  }
});
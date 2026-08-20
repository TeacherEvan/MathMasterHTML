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

  test("preserves query and hash while forwarding from a malformed seeded state", async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.addInitScript(() => {
      localStorage.setItem(
        "mathmaster_player_profile_v1",
        "{ not valid json ",
      );
      localStorage.setItem(
        "mathmaster_onboarding_v1",
        "corrupted-string",
      );
    });

    await page.goto("/index.html?welcome=returning#scoreboard", {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(
      /\/src\/pages\/index\.html\?welcome=returning#scoreboard$/,
    );

    expect(errors).toEqual([]);
  });
});
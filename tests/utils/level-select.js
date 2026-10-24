// @ts-check
/**
 * Shared level-select helpers.
 *
 * The level-select page plays a card entrance animation that scales each
 * card up while it fades in. A card that is still mid-flight reports a
 * moving bounding box, so Playwright's actionability check never settles
 * and the click times out - and a scaled card reports smaller geometry
 * than the layout it ends up in, which breaks exact-pixel assertions.
 *
 * Every spec that clicks a level button or measures a level card has to
 * wait for that animation to finish first. This is the single place that
 * knows how.
 */

/** The entrance animations that move the level cards. */
const ENTRANCE_ANIMATIONS = ["level-enter-up", "level-enter-scale"];

/**
 * @param {import("@playwright/test").Page} page
 */
export async function waitForLevelCardsToSettle(page) {
  // No explicit timeout here: the wait inherits the test's budget. An
  // entrance animation that is still running after a fixed number of
  // milliseconds is a slow host, not a failure, and cutting the wait short
  // only turns it into a click timeout further down.
  await page.waitForFunction(
    (entranceAnimations) => {
      const cards = Array.from(document.querySelectorAll(".level-card"));
      if (cards.length === 0) {
        return false;
      }

      return cards.every((card) => {
        const entranceRunning = card
          .getAnimations({ subtree: true })
          .some(
            (animation) =>
              entranceAnimations.includes(animation.animationName) &&
              animation.playState === "running",
          );

        if (entranceRunning) {
          return false;
        }

        const style = window.getComputedStyle(card);
        const opacity = Number.parseFloat(style.opacity || "1");
        const transform = style.transform;

        const transformSettled = (() => {
          if (transform === "none") {
            return true;
          }

          const match = transform.match(/^matrix\((.+)\)$/);
          if (!match) {
            return false;
          }

          const values = match[1]
            .split(",")
            .map((value) => Number.parseFloat(value.trim()));
          if (values.length !== 6) {
            return false;
          }

          const [scaleX, skewY, skewX, scaleY, translateX, translateY] = values;
          return (
            Math.abs(scaleX - 1) <= 0.01 &&
            Math.abs(skewY) <= 0.01 &&
            Math.abs(skewX) <= 0.01 &&
            Math.abs(scaleY - 1) <= 0.01 &&
            Math.abs(translateX) <= 0.5 &&
            Math.abs(translateY) <= 6
          );
        })();

        return opacity >= 0.99 && transformSettled;
      });
    },
    ENTRANCE_ANIMATIONS,
  );
}

/**
 * Clicks a level CTA once the level cards have finished their entrance
 * animation.
 *
 * @param {import("@playwright/test").Page} page
 * @param {string} level
 */
export async function clickLevelButton(page, level) {
  await waitForLevelCardsToSettle(page);
  await page.locator(`.level-card[data-level="${level}"] .level-button`).click();
}

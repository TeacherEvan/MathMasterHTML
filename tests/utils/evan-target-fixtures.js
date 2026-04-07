import { gotoGameRuntime } from "./onboarding-runtime.js";

const DEFAULT_RECT = {
  x: 80,
  y: 120,
  width: 40,
  height: 40,
  top: 120,
  left: 80,
  right: 120,
  bottom: 160,
};

export async function gotoEvanGame(page, search) {
  await gotoGameRuntime(page, `${search}&case=${Date.now()}`);
  await page.waitForSelector("#start-game-btn", {
    state: "visible",
    timeout: 10000,
  });
}

export async function installRectTarget(
  page,
  name,
  text = "",
  rect = DEFAULT_RECT,
) {
  await page.evaluate(
    ({ targetName, textContent, targetRect }) => {
      const target = document.createElement("button");
      target.dataset.testTarget = targetName;
      target.textContent = textContent;
      target.getBoundingClientRect = () => ({
        ...targetRect,
        toJSON() {
          return this;
        },
      });
      document.body.appendChild(target);
    },
    { targetName: name, textContent: text, targetRect: rect },
  );
}

const WormConstants = window.WormConstants || {};

function stealSymbol(behavior, worm) {
  const logger = behavior.logger;
  const system = behavior.system;

  if (!worm || !worm.element) {
    logger.warn("⚠️", "stealSymbol called with invalid worm object");
    return;
  }

  const panelBRect = system.getCachedContainerRect();
  const wormInPanelB =
    worm.x >= panelBRect.left &&
    worm.x <= panelBRect.right &&
    worm.y >= panelBRect.top &&
    worm.y <= panelBRect.bottom;

  if (!wormInPanelB) {
    logger.log(`🐛 Worm ${worm.id} outside Panel B - cannot steal symbols`);
    worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
    worm.isRushingToTarget = false;
    return;
  }

  const symbolsSource = worm.isPurple
    ? system.getCachedAllSymbols()
    : system.getCachedRevealedSymbols();

  const allAvailableSymbols = Array.from(symbolsSource).filter(
    (el) =>
      !el.dataset.stolen &&
      !el.classList.contains("space-symbol") &&
      !el.classList.contains("completed-row-symbol"),
  );

  let availableSymbols;
  if (worm.canStealBlue && worm.isPurple) {
    const redSymbols = allAvailableSymbols.filter((el) =>
      el.classList.contains("hidden-symbol"),
    );

    if (redSymbols.length > 0) {
      availableSymbols = redSymbols;
      logger.log(
        `🟣 PURPLE WORM - ${redSymbols.length} red symbols available (preferring red)`,
      );
    } else {
      const blueSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
      );
      availableSymbols = blueSymbols;
      logger.log(
        `🟣 PURPLE WORM - NO red symbols! Stealing blue symbols (${blueSymbols.length} available)`,
      );
    }
  } else {
    availableSymbols = allAvailableSymbols.filter((el) =>
      el.classList.contains("hidden-symbol"),
    );
    logger.log(
      `🐛 Normal worm - ${availableSymbols.length} red symbols available`,
    );
  }

  if (availableSymbols.length === 0) {
    logger.log("🐛 No symbols available to steal");
    worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
    worm.isRushingToTarget = false;
    return;
  }

  let targetSymbol = null;
  if (worm.targetSymbol) {
    const normalizedTarget = system.utils.normalizeSymbol(worm.targetSymbol);
    targetSymbol = availableSymbols.find((el) => {
      const elSymbol = system.utils.normalizeSymbol(el.textContent);
      return elSymbol === normalizedTarget;
    });
  }

  if (!targetSymbol) {
    targetSymbol =
      availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
  }

  if (!targetSymbol || !targetSymbol.textContent) {
    logger.warn("⚠️", `Worm ${worm.id} could not find valid target symbol`);
    worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
    worm.isRushingToTarget = false;
    return;
  }

  const symbolValue = targetSymbol.textContent;
  const wasBlueSymbol = targetSymbol.classList.contains("revealed-symbol");

  logger.log(
    `🐛 Worm ${worm.id} stealing ${
      wasBlueSymbol ? "BLUE" : "RED"
    } symbol: "${symbolValue}"`,
  );

  targetSymbol.dataset.stolen = "true";
  targetSymbol.classList.add("stolen");
  targetSymbol.classList.remove("revealed-symbol");
  targetSymbol.classList.add("hidden-symbol");
  targetSymbol.style.visibility = "hidden";

  worm.stolenSymbol = symbolValue;
  worm.targetElement = targetSymbol;
  worm.hasStolen = true;
  worm.isRushingToTarget = false;
  worm.wasBlueSymbol = wasBlueSymbol;
  worm.path = null;
  worm.pathIndex = 0;
  worm.lastPathUpdate = 0;

  logger.log(
    `🌈 Worm ${worm.id} stole ${
      wasBlueSymbol ? "blue" : "red"
    } symbol - ACTIVATING LSD FLICKER with ${WormConstants.FLICKER_SPEED_BOOST *
      100}% SPEED BOOST!`,
  );
  worm.isFlickering = true;
  worm.element.classList.add("flickering");
  worm.currentSpeed = worm.baseSpeed * WormConstants.FLICKER_SPEED_BOOST;

  const stolenSymbolDiv = document.createElement("div");
  stolenSymbolDiv.className = "carried-symbol";
  stolenSymbolDiv.textContent = symbolValue;
  if (wasBlueSymbol) {
    stolenSymbolDiv.style.color = "#00ffff";
  }
  worm.element.appendChild(stolenSymbolDiv);

  logger.log(
    `🐛 Worm now carrying "${symbolValue}" and heading back to console hole!`,
  );

  system.checkGameOverCondition();
}

window.WormBehaviorModules = window.WormBehaviorModules || {};
window.WormBehaviorModules.stealSymbol = stealSymbol;

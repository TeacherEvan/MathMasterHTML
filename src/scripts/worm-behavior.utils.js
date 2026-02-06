function getAvailableSymbolsForWorm(behavior, worm, symbolsSource) {
  const allAvailableSymbols = Array.from(symbolsSource).filter(
    (el) =>
      !el.dataset.stolen &&
      !el.classList.contains("space-symbol") &&
      !el.classList.contains("completed-row-symbol"),
  );

  if (worm.isPurple && worm.canStealBlue) {
    const redSymbols = allAvailableSymbols.filter((el) =>
      el.classList.contains("hidden-symbol"),
    );
    if (redSymbols.length > 0) return redSymbols;

    return allAvailableSymbols.filter((el) =>
      el.classList.contains("revealed-symbol"),
    );
  }

  return allAvailableSymbols.filter((el) =>
    el.classList.contains("hidden-symbol"),
  );
}

function resolveTargetElement(behavior, worm, symbolsSource) {
  const system = behavior.system;
  const availableSymbols = getAvailableSymbolsForWorm(
    behavior,
    worm,
    symbolsSource,
  );

  if (availableSymbols.length === 0) {
    return null;
  }

  let targetElement = null;

  if (worm.targetSymbol) {
    const normalizedTarget = system.utils.normalizeSymbol(worm.targetSymbol);
    targetElement = availableSymbols.find((el) => {
      const elSymbol = system.utils.normalizeSymbol(el.textContent);
      return elSymbol === normalizedTarget;
    });
  }

  if (!targetElement) {
    let nearestSymbol = null;
    let nearestDistance = Infinity;

    availableSymbols.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const symbolX = rect.left + rect.width / 2;
      const symbolY = rect.top + rect.height / 2;
      const distance = Math.sqrt(
        Math.pow(worm.x - symbolX, 2) + Math.pow(worm.y - symbolY, 2),
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestSymbol = el;
      }
    });

    if (nearestSymbol) {
      targetElement = nearestSymbol;
      worm.targetSymbol = nearestSymbol.textContent;
    }
  }

  return targetElement;
}

window.WormBehaviorModules = window.WormBehaviorModules || {};
window.WormBehaviorModules.getAvailableSymbolsForWorm = getAvailableSymbolsForWorm;
window.WormBehaviorModules.resolveTargetElement = resolveTargetElement;

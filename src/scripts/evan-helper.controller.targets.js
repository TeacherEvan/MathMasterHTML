(function () {
  function normalize(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function centerOf(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function getNeededSymbols() {
    const stepIndex = window.GameSymbolHandlerCore?.getCurrentStepIndex?.();
    const selector =
      Number.isInteger(stepIndex) && stepIndex >= 0
        ? `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`
        : "#solution-container .hidden-symbol";
    const slots = document.querySelectorAll(selector);
    const needed = [];

    for (const slot of slots) {
      const expected = slot.dataset.expected || slot.textContent;
      if (normalize(expected) && !slot.classList.contains("revealed")) {
        needed.push(expected.trim());
      }
    }
    return needed;
  }

  function getNeededSymbol() {
    return getNeededSymbols()[0] || null;
  }

  function findFallingSymbol(symbol) {
    const candidates = document.querySelectorAll(
      "#panel-c .falling-symbol:not(.clicked)",
    );
    let best = null;
    let bestBottom = -Infinity;
    const normalizedSymbol = normalize(symbol);

    for (const el of candidates) {
      if (!el.isConnected || normalize(el.textContent) !== normalizedSymbol) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > bestBottom) {
        best = el;
        bestBottom = r.bottom;
      }
    }
    return best;
  }

  function findBestFallingSymbol(symbols) {
    if (!Array.isArray(symbols) || symbols.length === 0) return null;

    let best = null;
    let bestBottom = -Infinity;
    const normalized = new Set(symbols.map((symbol) => normalize(symbol)));
    const candidates = document.querySelectorAll(
      "#panel-c .falling-symbol:not(.clicked)",
    );

    for (const el of candidates) {
      if (!el.isConnected || !normalized.has(normalize(el.textContent))) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.bottom > bestBottom) {
        best = el;
        bestBottom = r.bottom;
      }
    }

    return best;
  }

  function findGreenWormSegment() {
    const segments = document.querySelectorAll(
      ".worm-container:not(.purple-worm) .worm-segment",
    );
    for (const seg of segments) {
      if (isVisible(seg)) return seg;
    }
    return null;
  }

  function findMuffinReward() {
    const muffins = document.querySelectorAll("button.worm-muffin-reward");
    for (const m of muffins) {
      if (isVisible(m) && !m.disabled) return m;
    }
    return null;
  }

  function hasPurpleWorm() {
    return document.querySelector(".worm-container.purple-worm") !== null;
  }

  function getBestPowerUp(cachedGreenSeg) {
    const sys = window.wormSystem?.powerUpSystem;
    if (!sys || !sys.inventory) return null;
    const inv = sys.inventory;
    const hasPurple = hasPurpleWorm();
    const greenSeg =
      cachedGreenSeg !== undefined ? cachedGreenSeg : findGreenWormSegment();
    const hasWorms = greenSeg !== null || hasPurple;
    if (!hasWorms) return null;
    if (hasPurple && inv.devil > 0) return "devil";
    const multiWorm =
      document.querySelectorAll(".worm-container:not(.purple-worm)").length > 1;
    if (multiWorm && inv.spider > 0) return "spider";
    if (inv.chainLightning > 0) return "chainLightning";
    return null;
  }

  window.EvanTargets = {
    isVisible,
    centerOf,
    getNeededSymbols,
    getNeededSymbol,
    findFallingSymbol,
    findBestFallingSymbol,
    findGreenWormSegment,
    findMuffinReward,
    hasPurpleWorm,
    getBestPowerUp,
  };
})();

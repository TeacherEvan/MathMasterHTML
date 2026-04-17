// src/scripts/symbol-rain.helpers.spawn.js - Spawn helpers
console.log("🎯 SymbolRain helpers: spawn loading...");

(function attachSymbolRainSpawnHelpers() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});
  const supportsIndividualTranslate =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("translate", "1px 1px");

  helpers.setSymbolPosition = function setSymbolPosition(symbol, x, y) {
    if (supportsIndividualTranslate) {
      symbol.style.translate = `${x}px ${y}px`;
      symbol.style.transform = "";
      return;
    }

    symbol.style.translate = "";
    symbol.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  helpers.createFallingSymbol = function createFallingSymbol(
    {
      symbols,
      symbolRainContainer,
      config,
      activeFallingSymbols,
      symbolPool,
      lastSymbolSpawnTimestamp,
    },
    {
      column,
      isInitialPopulation = false,
      forcedSymbol = null,
      initialY = null,
    },
  ) {
    if (activeFallingSymbols.length >= (config.maxActiveSymbols || 200)) {
      return null;
    }

    const symbol = symbolPool.get();
    symbol.className = "falling-symbol";
    symbol.textContent =
      forcedSymbol || symbols[Math.floor(Math.random() * symbols.length)];

    const horizontalOffset = (Math.random() - 0.5) * 40;
    const x =
      column * config.columnWidth + config.columnWidth / 2 + horizontalOffset;
    const y = Number.isFinite(initialY)
      ? initialY
      : isInitialPopulation
        ? Math.random() * symbolRainContainer.offsetHeight
        : -50;

    helpers.setSymbolPosition(symbol, x, y);

    symbolRainContainer.appendChild(symbol);

    activeFallingSymbols.push({
      element: symbol,
      column: column,
      y,
      x,
      symbol: symbol.textContent,
      isInFaceReveal: false,
      faceRevealStartTime: 0,
    });

    if (forcedSymbol) {
      lastSymbolSpawnTimestamp[forcedSymbol] = Date.now();
    }

    return symbol;
  };

  helpers.populateInitialSymbols = function populateInitialSymbols(
    {
      config,
      columnCount,
      isMobileMode,
      activeFallingSymbols,
      symbols,
      symbolRainContainer,
      symbolPool,
      lastSymbolSpawnTimestamp,
    },
    setInitialPopulationComplete,
  ) {
    const totalWaves = isMobileMode ? 4 : 8;

    function spawnWave(waveNumber) {
      if (waveNumber >= totalWaves) {
        setInitialPopulationComplete();
        return;
      }

      const columnsToUse = Math.min(columnCount, config.symbolsPerWave);
      const columnStep = Math.floor(columnCount / columnsToUse);

      for (let i = 0; i < config.symbolsPerWave && i < columnCount; i++) {
        const column = (i * columnStep) % columnCount;
        helpers.createFallingSymbol(
          {
            symbols,
            symbolRainContainer,
            config,
            activeFallingSymbols,
            symbolPool,
            lastSymbolSpawnTimestamp,
          },
          { column, isInitialPopulation: true },
        );
      }

      setTimeout(() => spawnWave(waveNumber + 1), config.waveInterval);
    }

    spawnWave(0);
  };
})();

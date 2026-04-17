(function () {
  const SymbolRainHelpers = window.SymbolRainHelpers;

  function normalizeSymbol(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function getCurrentNeededSymbols() {
    const stepIndex = window.GameSymbolHandlerCore?.getCurrentStepIndex?.();
    const selector =
      Number.isInteger(stepIndex) && stepIndex >= 0
        ? `#solution-container [data-step-index="${stepIndex}"].hidden-symbol`
        : "#solution-container .hidden-symbol";

    return Array.from(document.querySelectorAll(selector))
      .map((element) => element.dataset.expected || element.textContent || "")
      .map((value) => String(value).trim())
      .filter(Boolean);
  }

  function hasVisibleLiveSymbol(state, targetSymbol) {
    const normalizedTarget = normalizeSymbol(targetSymbol);
    const minVisibleY = -1 * (state.config.symbolHeight || 42);
    const maxVisibleY = state.cachedContainerHeight + (state.config.symbolHeight || 42);

    return state.activeFallingSymbols.some((symbolObj) => {
      if (!symbolObj?.element?.isConnected) {
        return false;
      }

      if (symbolObj.element.classList.contains("clicked")) {
        return false;
      }

      if (normalizeSymbol(symbolObj.symbol) !== normalizedTarget) {
        return false;
      }

      return symbolObj.y >= minVisibleY && symbolObj.y <= maxVisibleY;
    });
  }

  function isVisibleInRainWindow(state, symbolObj) {
    if (!symbolObj?.element?.isConnected) {
      return false;
    }

    if (symbolObj.element.classList.contains("clicked")) {
      return false;
    }

    const minVisibleY = -1 * (state.config.symbolHeight || 42);
    const maxVisibleY = state.cachedContainerHeight + (state.config.symbolHeight || 42);

    return symbolObj.y >= minVisibleY && symbolObj.y <= maxVisibleY;
  }

  function getVisibleActiveSymbolCount(state) {
    return state.activeFallingSymbols.filter((symbolObj) =>
      isVisibleInRainWindow(state, symbolObj),
    ).length;
  }

  function getAvailablePriorityColumns(state) {
    const availableColumnIndices = [];

    for (let columnIndex = 0; columnIndex < state.columnCount; columnIndex++) {
      if (
        !SymbolRainHelpers.isColumnCrowded(
          state.activeFallingSymbols,
          columnIndex,
        )
      ) {
        availableColumnIndices.push(columnIndex);
      }
    }

    return availableColumnIndices;
  }

  function releaseSymbolForPrioritySpawn(state, neededSymbolSet) {
    const maxActiveSymbols = state.config.maxActiveSymbols || 200;
    const hasCapacity = state.activeFallingSymbols.length < maxActiveSymbols;
    const availableColumns = getAvailablePriorityColumns(state);

    if (hasCapacity && availableColumns.length > 0) {
      return availableColumns;
    }

    let replacementIndex = -1;

    for (let symbolIndex = 0; symbolIndex < state.activeFallingSymbols.length; symbolIndex++) {
      const symbolObj = state.activeFallingSymbols[symbolIndex];
      if (!symbolObj?.element?.isConnected) {
        continue;
      }

      if (symbolObj.element.classList.contains("clicked")) {
        continue;
      }

      if (neededSymbolSet.has(normalizeSymbol(symbolObj.symbol))) {
        continue;
      }

      if (
        replacementIndex === -1 ||
        symbolObj.y > state.activeFallingSymbols[replacementIndex].y
      ) {
        replacementIndex = symbolIndex;
      }
    }

    if (replacementIndex === -1) {
      return [];
    }

    const [symbolObj] = state.activeFallingSymbols.splice(replacementIndex, 1);
    const recycledColumn = symbolObj.column;

    SymbolRainHelpers.cleanupSymbolObject({
      symbolObj,
      activeFaceReveals: state.activeFaceReveals,
      symbolPool: state.symbolPool,
      spatialGrid: state.spatialGrid,
    });

    if (
      Number.isInteger(recycledColumn) &&
      recycledColumn >= 0 &&
      recycledColumn < state.columnCount
    ) {
      return [recycledColumn];
    }

    return getAvailablePriorityColumns(state);
  }

  function spawnPrioritySymbol(state, symbolChar, neededSymbolSet, currentTimestamp) {
    const availableColumns = releaseSymbolForPrioritySpawn(
      state,
      neededSymbolSet,
    );

    if (!availableColumns.length) {
      return false;
    }

    const randomColumnIndex = availableColumns[
      Math.floor(Math.random() * availableColumns.length)
    ];
    const createdSymbol = SymbolRainHelpers.createFallingSymbol(
      {
        symbols: state.symbols,
        symbolRainContainer: state.symbolRainContainer,
        config: state.config,
        activeFallingSymbols: state.activeFallingSymbols,
        symbolPool: state.symbolPool,
        lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
      },
      {
        column: randomColumnIndex,
        isInitialPopulation: false,
        forcedSymbol: symbolChar,
      },
    );

    if (!createdSymbol) {
      state.lastSymbolSpawnTimestamp[symbolChar] = currentTimestamp;
      return false;
    }

    return true;
  }

  function maintainCompactRainFloor(state, currentTimestamp) {
    if (!state.isMobileMode || state.columnCount <= 0) {
      return;
    }

    const minVisibleSymbols = Math.min(
      state.columnCount,
      state.config.minVisibleSymbols || 0,
    );

    if (minVisibleSymbols <= 0) {
      return;
    }

    if (currentTimestamp - (state.lastCompactBackfillTimestamp || 0) < 250) {
      return;
    }

    let visibleCount = getVisibleActiveSymbolCount(state);
    if (visibleCount >= minVisibleSymbols) {
      return;
    }

    const neededSymbols = [...new Set(getCurrentNeededSymbols())];
    const neededSymbolSet = new Set(
      neededSymbols.map((symbolChar) => normalizeSymbol(symbolChar)),
    );
    const prioritizedMissingSymbols = neededSymbols.filter(
      (symbolChar) => !hasVisibleLiveSymbol(state, symbolChar),
    );

    state.lastCompactBackfillTimestamp = currentTimestamp;

    while (visibleCount < minVisibleSymbols) {
      const symbolChar =
        prioritizedMissingSymbols.shift() ||
        state.symbols[Math.floor(Math.random() * state.symbols.length)];

      if (!spawnPrioritySymbol(state, symbolChar, neededSymbolSet, currentTimestamp)) {
        break;
      }

      visibleCount += 1;
    }
  }

  function spawnNeededSymbols(state, currentTimestamp) {
    if (!state.isMobileMode || state.columnCount <= 0) {
      return;
    }

    const neededSymbols = [...new Set(getCurrentNeededSymbols())];
    const neededSymbolSet = new Set(
      neededSymbols.map((symbolChar) => normalizeSymbol(symbolChar)),
    );
    const hasVisibleRain = getVisibleActiveSymbolCount(state) > 0;
    const priorityInterval = Math.min(
      hasVisibleRain ? state.config.guaranteedSpawnInterval : 0,
      600,
    );

    neededSymbols.forEach((symbolChar) => {
      const lastSpawnTimestamp = state.lastSymbolSpawnTimestamp[symbolChar] || 0;

      if (hasVisibleLiveSymbol(state, symbolChar)) {
        return;
      }

      if (currentTimestamp - lastSpawnTimestamp <= priorityInterval) {
        return;
      }

      if (!spawnPrioritySymbol(state, symbolChar, neededSymbolSet, currentTimestamp)) {
        state.lastSymbolSpawnTimestamp[symbolChar] = currentTimestamp - priorityInterval;
      }
    });
  }

  function handleRandomSpawns(state) {
    if (!SymbolRainHelpers) {
      return;
    }

    maintainCompactRainFloor(state, Date.now());

    for (let columnIndex = 0; columnIndex < state.columnCount; columnIndex++) {
      if (
        Math.random() < state.config.spawnRate &&
        !SymbolRainHelpers.isColumnCrowded(
          state.activeFallingSymbols,
          columnIndex,
        )
      ) {
        const randomSymbol =
          state.symbols[Math.floor(Math.random() * state.symbols.length)];
        SymbolRainHelpers.createFallingSymbol(
          {
            symbols: state.symbols,
            symbolRainContainer: state.symbolRainContainer,
            config: state.config,
            activeFallingSymbols: state.activeFallingSymbols,
            symbolPool: state.symbolPool,
            lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
          },
          {
            column: columnIndex,
            isInitialPopulation: false,
            forcedSymbol: randomSymbol,
          },
        );
      }
    }

    if (Math.random() < state.config.burstSpawnRate) {
      const burstSymbolCount = 2 + Math.floor(Math.random() * 2);
      const availableColumnIndices = [];

      for (
        let columnIndex = 0;
        columnIndex < state.columnCount;
        columnIndex++
      ) {
        if (
          !SymbolRainHelpers.isColumnCrowded(
            state.activeFallingSymbols,
            columnIndex,
          )
        ) {
          availableColumnIndices.push(columnIndex);
        }
      }

      for (
        let burstIndex = 0;
        burstIndex < burstSymbolCount && availableColumnIndices.length > 0;
        burstIndex++
      ) {
        const randomArrayIndex = Math.floor(
          Math.random() * availableColumnIndices.length,
        );
        const selectedColumnIndex = availableColumnIndices.splice(
          randomArrayIndex,
          1,
        )[0];
        const randomSymbol =
          state.symbols[Math.floor(Math.random() * state.symbols.length)];
        SymbolRainHelpers.createFallingSymbol(
          {
            symbols: state.symbols,
            symbolRainContainer: state.symbolRainContainer,
            config: state.config,
            activeFallingSymbols: state.activeFallingSymbols,
            symbolPool: state.symbolPool,
            lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
          },
          {
            column: selectedColumnIndex,
            isInitialPopulation: false,
            forcedSymbol: randomSymbol,
          },
        );
      }
    }
  }

  function startGuaranteedSpawnController(state) {
    if (!SymbolRainHelpers) {
      return;
    }

    if (state.guaranteedSpawnControllerId) {
      return;
    }

    state.guaranteedSpawnControllerId = setInterval(() => {
      const currentTimestamp = Date.now();

      spawnNeededSymbols(state, currentTimestamp);

      state.symbols.forEach((symbolChar) => {
        if (
          currentTimestamp - state.lastSymbolSpawnTimestamp[symbolChar] >
          state.config.guaranteedSpawnInterval
        ) {
          const randomColumnIndex = Math.floor(
            Math.random() * state.columnCount,
          );
          SymbolRainHelpers.createFallingSymbol(
            {
              symbols: state.symbols,
              symbolRainContainer: state.symbolRainContainer,
              config: state.config,
              activeFallingSymbols: state.activeFallingSymbols,
              symbolPool: state.symbolPool,
              lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
            },
            {
              column: randomColumnIndex,
              isInitialPopulation: false,
              forcedSymbol: symbolChar,
            },
          );
        }
      });
    }, 1000);
  }

  function stopGuaranteedSpawnController(state) {
    if (!state?.guaranteedSpawnControllerId) {
      return;
    }

    clearInterval(state.guaranteedSpawnControllerId);
    state.guaranteedSpawnControllerId = null;
  }

  window.SymbolRainSpawn = {
    handleRandomSpawns,
    startGuaranteedSpawnController,
    stopGuaranteedSpawnController,
  };
})();

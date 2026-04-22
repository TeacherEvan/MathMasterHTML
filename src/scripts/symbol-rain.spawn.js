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

    return state.activeFallingSymbols.some((symbolObj) => {
      if (normalizeSymbol(symbolObj.symbol) !== normalizedTarget) {
        return false;
      }

      return SymbolRainHelpers.isSymbolVisibleInRainWindow(state, symbolObj);
    });
  }

  function isStableVisibleLiveSymbol(state, targetSymbol) {
    const normalizedTarget = normalizeSymbol(targetSymbol);
    const getRainWindowRect = SymbolRainHelpers?.getRainWindowRect;

    if (typeof getRainWindowRect !== "function") {
      return hasVisibleLiveSymbol(state, targetSymbol);
    }

    const rainRect = getRainWindowRect(state?.symbolRainContainer);

    if (!rainRect) {
      return false;
    }

    return state.activeFallingSymbols.some((symbolObj) => {
      if (normalizeSymbol(symbolObj.symbol) !== normalizedTarget) {
        return false;
      }

      if (!symbolObj?.element?.isConnected || symbolObj.element.classList.contains("clicked")) {
        return false;
      }

      const rect = symbolObj.element.getBoundingClientRect();
      const overlapHeight = Math.min(rect.bottom, rainRect.bottom) - Math.max(rect.top, rainRect.top);
      const visibleHeightThreshold = Math.min(
        rect.height,
        Math.max(rect.height * 0.6, (state.config.symbolHeight || 42) * 0.6),
      );
      const centerY = rect.top + rect.height / 2;
      const safeTop = rainRect.top + (state.config.symbolHeight || 42) * 0.35;
      const safeBottom = rainRect.bottom - (state.config.symbolHeight || 42) * 0.9;

      return (
        overlapHeight >= visibleHeightThreshold &&
        centerY >= safeTop &&
        centerY <= safeBottom
      );
    });
  }

  function isVisibleInRainWindow(state, symbolObj) {
    return SymbolRainHelpers.isSymbolVisibleInRainWindow(state, symbolObj);
  }

  function getMissingStableNeededSymbols(state) {
    const neededSymbols = [...new Set(getCurrentNeededSymbols())];

    return neededSymbols.filter(
      (symbolChar) => !isStableVisibleLiveSymbol(state, symbolChar),
    );
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

  function getLeastOccupiedAvailableColumn(state, availableColumns) {
    let selectedColumn = availableColumns[0];
    let selectedLoad = Number.POSITIVE_INFINITY;

    for (const columnIndex of availableColumns) {
      let columnLoad = 0;

      for (const symbolObj of state.activeFallingSymbols) {
        if (symbolObj.column === columnIndex && isVisibleInRainWindow(state, symbolObj)) {
          columnLoad += 1;
        }
      }

      if (columnLoad < selectedLoad) {
        selectedColumn = columnIndex;
        selectedLoad = columnLoad;
      }
    }

    return selectedColumn;
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

  function getVisiblePrioritySpawnY(state, slotIndex = 0) {
    if (!Number.isFinite(state.cachedContainerHeight) || state.cachedContainerHeight <= 0) {
      return 0;
    }

    const symbolHeight = state.config.symbolHeight || 42;
    const minY = Math.max(0, symbolHeight * 0.9);
    const maxY = Math.max(minY, state.cachedContainerHeight - symbolHeight * 2.4);
    const verticalBandCount = Math.max(
      1,
      Math.min(
        6,
        Math.floor((maxY - minY) / Math.max(symbolHeight * 1.1, 1)) + 1,
      ),
    );

    if (verticalBandCount === 1) {
      return Math.max(0, Math.min(minY, state.cachedContainerHeight - symbolHeight));
    }

    const bandIndex = Math.abs(slotIndex) % verticalBandCount;
    const preferredY = minY + ((maxY - minY) / (verticalBandCount - 1)) * bandIndex;

    return Math.max(0, Math.min(preferredY, state.cachedContainerHeight - symbolHeight));
  }

  function spawnPrioritySymbol(
    state,
    symbolChar,
    neededSymbolSet,
    currentTimestamp,
    options = {},
  ) {
    const availableColumns = releaseSymbolForPrioritySpawn(
      state,
      neededSymbolSet,
    );

    if (!availableColumns.length) {
      return false;
    }

    const selectedColumnIndex = options.preferLeastOccupiedColumn
      ? getLeastOccupiedAvailableColumn(state, availableColumns)
      : availableColumns[Math.floor(Math.random() * availableColumns.length)];
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
        column: selectedColumnIndex,
        isInitialPopulation: false,
        forcedSymbol: symbolChar,
        initialY: options.initialY,
        horizontalOffset: options.horizontalOffset,
      },
    );

    if (!createdSymbol) {
      state.lastSymbolSpawnTimestamp[symbolChar] = currentTimestamp;
      return false;
    }

    return true;
  }

  function maintainVisibleRainFloor(state, currentTimestamp) {
    if (state.columnCount <= 0) {
      return;
    }

    const minVisibleSymbols = state.config.minVisibleSymbols || 0;

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

    const neededSymbols = getMissingStableNeededSymbols(state);
    const neededSymbolSet = new Set(
      getCurrentNeededSymbols().map((symbolChar) => normalizeSymbol(symbolChar)),
    );
    const prioritizedMissingSymbols = [...neededSymbols];

    state.lastCompactBackfillTimestamp = currentTimestamp;

    let spawnIndex = 0;

    while (visibleCount < minVisibleSymbols) {
      const symbolChar =
        prioritizedMissingSymbols.shift() ||
        state.symbols[Math.floor(Math.random() * state.symbols.length)];

      if (
        !spawnPrioritySymbol(
          state,
          symbolChar,
          neededSymbolSet,
          currentTimestamp,
          {
            initialY: getVisiblePrioritySpawnY(state, spawnIndex),
            preferLeastOccupiedColumn: true,
            horizontalOffset: 0,
          },
        )
      ) {
        break;
      }

      visibleCount += 1;
      spawnIndex += 1;
    }
  }

  function maintainNeededSymbolVisibility(state, currentTimestamp) {
    if (state.columnCount <= 0) {
      return;
    }

    if (currentTimestamp - (state.lastNeededSymbolVisibilitySyncAt || 0) < 150) {
      return;
    }

    const missingSymbols = getMissingStableNeededSymbols(state);
    if (!missingSymbols.length) {
      return;
    }

    const neededSymbols = [...new Set(getCurrentNeededSymbols())];

    const neededSymbolSet = new Set(
      neededSymbols.map((symbolChar) => normalizeSymbol(symbolChar)),
    );

    state.lastNeededSymbolVisibilitySyncAt = currentTimestamp;

    for (const symbolChar of missingSymbols) {
      if (
        !spawnPrioritySymbol(
          state,
          symbolChar,
          neededSymbolSet,
          currentTimestamp,
          {
            initialY: getVisiblePrioritySpawnY(state, symbolChar.charCodeAt(0) || 0),
            preferLeastOccupiedColumn: true,
            horizontalOffset: 0,
          },
        )
      ) {
        break;
      }
    }
  }

  function spawnNeededSymbols(state, currentTimestamp) {
    if (state.columnCount <= 0) {
      return;
    }

    const neededSymbols = [...new Set(getCurrentNeededSymbols())];
    const neededSymbolSet = new Set(
      neededSymbols.map((symbolChar) => normalizeSymbol(symbolChar)),
    );
    const hasVisibleRain = getVisibleActiveSymbolCount(state) > 0;
    const priorityInterval = hasVisibleRain
      ? state.config.guaranteedSpawnInterval
      : 0;

    neededSymbols.forEach((symbolChar) => {
      const lastSpawnTimestamp = state.lastSymbolSpawnTimestamp[symbolChar] || 0;

      if (isStableVisibleLiveSymbol(state, symbolChar)) {
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

    const currentTimestamp = Date.now();

    maintainNeededSymbolVisibility(state, currentTimestamp);
    maintainVisibleRainFloor(state, currentTimestamp);

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

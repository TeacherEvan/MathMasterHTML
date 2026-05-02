(function () {
  const SymbolRainHelpers = window.SymbolRainHelpers;
  const SymbolRainTargets = window.SymbolRainTargets;
  const TARGET_CIRCULATION_INTERVAL_MS = 250;

  function isVisibleInRainWindow(state, symbolObj) {
    return SymbolRainHelpers.isSymbolVisibleInRainWindow(state, symbolObj);
  }

  function getVisibleActiveSymbolCount(state) {
    return state.activeFallingSymbols.filter((symbolObj) =>
      isVisibleInRainWindow(state, symbolObj),
    ).length;
  }

  function hasVisibleActiveSymbol(state, targetSymbol) {
    const normalizedTarget = SymbolRainTargets?.normalizeSymbol?.(targetSymbol);

    if (!normalizedTarget) {
      return false;
    }

    for (const symbolObj of state.activeFallingSymbols) {
      const symbol = SymbolRainTargets?.normalizeSymbol?.(
        symbolObj?.symbol || symbolObj?.element?.textContent || "",
      );

      if (symbol !== normalizedTarget) {
        continue;
      }

      if (isVisibleInRainWindow(state, symbolObj)) {
        return true;
      }
    }

    return false;
  }

  function maintainCurrentStepTargetCirculation(state, currentTimestamp) {
    if (
      currentTimestamp - (state.lastTargetCirculationTimestamp || 0) <
      TARGET_CIRCULATION_INTERVAL_MS
    ) {
      return;
    }

    state.lastTargetCirculationTimestamp = currentTimestamp;

    const nextNeededSymbol = SymbolRainTargets?.getNextRequiredSymbol?.();

    if (!nextNeededSymbol || hasVisibleActiveSymbol(state, nextNeededSymbol)) {
      return;
    }

    spawnPrioritySymbol(state, nextNeededSymbol, currentTimestamp, {
      initialY: getVisiblePrioritySpawnY(state, 0),
      preferLeastOccupiedColumn: true,
      horizontalOffset: 0,
    });
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

  function releaseSymbolForPrioritySpawn(state) {
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
    const rainRect = SymbolRainHelpers?.getRainWindowRect?.(state?.symbolRainContainer);
    const containerHeight = rainRect?.height || state.cachedContainerHeight;

    if (!Number.isFinite(containerHeight) || containerHeight <= 0) {
      return 0;
    }

    const symbolHeight = state.config.symbolHeight || 42;
    const minY = Math.max(0, symbolHeight * 0.9);
    const maxY = Math.max(minY, containerHeight - symbolHeight * 2.4);
    const verticalBandCount = Math.max(
      1,
      Math.min(
        6,
        Math.floor((maxY - minY) / Math.max(symbolHeight * 1.1, 1)) + 1,
      ),
    );

    if (verticalBandCount === 1) {
      return Math.max(0, Math.min(minY, containerHeight - symbolHeight));
    }

    const bandIndex = Math.abs(slotIndex) % verticalBandCount;
    const preferredY = minY + ((maxY - minY) / (verticalBandCount - 1)) * bandIndex;

    return Math.max(0, Math.min(preferredY, containerHeight - symbolHeight));
  }

  function spawnPrioritySymbol(
    state,
    symbolChar,
    currentTimestamp,
    options = {},
  ) {
    const availableColumns = releaseSymbolForPrioritySpawn(state);

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

    state.lastCompactBackfillTimestamp = currentTimestamp;

    let spawnIndex = 0;

    while (visibleCount < minVisibleSymbols) {
      const symbolChar =
        state.symbols[Math.floor(Math.random() * state.symbols.length)];

      if (
        !spawnPrioritySymbol(
          state,
          symbolChar,
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

  function handleRandomSpawns(state) {
    if (!SymbolRainHelpers) {
      return;
    }

    const currentTimestamp = Date.now();

    maintainCurrentStepTargetCirculation(state, currentTimestamp);
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
    if (state.guaranteedSpawnControllerId) {
      return;
    }

    state.guaranteedSpawnControllerId = 0;
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

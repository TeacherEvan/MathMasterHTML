(function() {
  const SymbolRainHelpers = window.SymbolRainHelpers;

  function handleRandomSpawns(state) {
    if (!SymbolRainHelpers) {
      return;
    }

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

    setInterval(() => {
      const currentTimestamp = Date.now();
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

  window.SymbolRainSpawn = {
    handleRandomSpawns,
    startGuaranteedSpawnController,
  };
})();

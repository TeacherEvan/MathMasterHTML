(function() {
  const SymbolRainHelpers = window.SymbolRainHelpers;
  const SymbolRainSpawn = window.SymbolRainSpawn;

  function animateSymbols(state) {
    if (!SymbolRainHelpers) {
      return;
    }

    // Tab visibility throttling
    if (!state.isTabVisible && Math.random() > 0.016) {
      return;
    }

    const containerHeight = state.cachedContainerHeight;
    const currentTime = Date.now();

    SymbolRainHelpers.triggerFaceRevealIfNeeded(
      {
        activeFallingSymbols: state.activeFallingSymbols,
        activeFaceReveals: state.activeFaceReveals,
        config: state.config,
      },
      state.faceRevealState,
      containerHeight,
      currentTime,
    );
    SymbolRainHelpers.cleanupFaceReveals(
      { activeFaceReveals: state.activeFaceReveals, config: state.config },
      currentTime,
    );

    state.spatialGrid.update(state.activeFallingSymbols);
    state.symbolsToRemove.clear();

    for (let i = 0; i < state.activeFallingSymbols.length; i++) {
      const symbolObj = state.activeFallingSymbols[i];
      if (state.symbolsToRemove.has(symbolObj)) continue;

      const touchingSymbol = SymbolRainHelpers.checkTouching(
        {
          config: state.config,
          isMobileMode: state.isMobileMode,
          spatialGrid: state.spatialGrid,
        },
        symbolObj,
      );
      if (touchingSymbol) {
        state.symbolsToRemove.add(symbolObj);
        state.symbolsToRemove.add(touchingSymbol);
      }
    }

    let writeIndex = 0;
    for (
      let readIndex = 0;
      readIndex < state.activeFallingSymbols.length;
      readIndex++
    ) {
      const symbolObj = state.activeFallingSymbols[readIndex];
      const isOffScreen = symbolObj.y > containerHeight + 50;
      const isStuckAtBottom =
        symbolObj.y > containerHeight - 100 &&
        state.activeFallingSymbols.length > 30;
      const isTouching = state.symbolsToRemove.has(symbolObj);

      if (isOffScreen || isStuckAtBottom || isTouching) {
        SymbolRainHelpers.cleanupSymbolObject({
          symbolObj,
          activeFaceReveals: state.activeFaceReveals,
          symbolPool: state.symbolPool,
        });
        continue;
      }

      if (
        !SymbolRainHelpers.checkCollision(
          {
            config: state.config,
            isMobileMode: state.isMobileMode,
            spatialGrid: state.spatialGrid,
          },
          symbolObj,
        )
      ) {
        symbolObj.y += state.symbolFallSpeed;
        symbolObj.element.style.top = `${symbolObj.y}px`;
      } else {
        symbolObj.y +=
          state.symbolFallSpeed * state.config.collisionSpeedFactor;
        symbolObj.element.style.top = `${symbolObj.y}px`;
      }

      state.activeFallingSymbols[writeIndex++] = symbolObj;
    }
    state.activeFallingSymbols.length = writeIndex;

    if (state.isInitialPopulation) {
      return;
    }

    if (SymbolRainSpawn) {
      SymbolRainSpawn.handleRandomSpawns(state);
    }
  }

  function startAnimation(state) {
    if (state.isAnimationRunning) return;
    state.isAnimationRunning = true;

    function loop() {
      if (state.isAnimationRunning) {
        animateSymbols(state);
        requestAnimationFrame(loop);
      }
    }

    loop();
  }

  function startSpeedController(state) {
    setInterval(() => {
      if (
        !state.isMobileMode &&
        state.symbolFallSpeed < state.config.maxFallSpeed
      ) {
        state.symbolFallSpeed *= 1.1;
      }
    }, 60000);
  }

  function resetSpeed(state) {
    state.symbolFallSpeed = state.config.initialFallSpeed;
  }

  window.SymbolRainAnimation = {
    animateSymbols,
    startAnimation,
    startSpeedController,
    resetSpeed,
  };
})();

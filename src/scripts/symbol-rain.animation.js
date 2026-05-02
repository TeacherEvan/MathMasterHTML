(function () {
  const SymbolRainHelpers = window.SymbolRainHelpers;

  function animateSymbols(state) {
    if (!SymbolRainHelpers) {
      return;
    }

    if (!state.isTabVisible && Math.random() > 0.016) {
      return;
    }

    const rainRect = SymbolRainHelpers.getRainWindowRect?.(
      state?.symbolRainContainer,
    );
    const containerHeight = rainRect?.height || state.cachedContainerHeight;
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

    state.symbolsToRemove.clear();

    const nextActiveSymbols = [];
    const symbolsForGrid = [];

    for (let i = 0; i < state.activeFallingSymbols.length; i += 1) {
      const symbolObj = state.activeFallingSymbols[i];
      if (!symbolObj?.element?.isConnected) {
        continue;
      }

      const symbolState = symbolObj.element.dataset?.symbolState || "hidden";
      symbolObj.element.style.opacity =
        symbolState === "visible" ? "1" : symbolState === "fading" ? "0" : "0";

      if (symbolState === "hidden") {
        nextActiveSymbols.push(symbolObj);
        continue;
      }

      const touchingSymbol = state.isMobileMode
        ? SymbolRainHelpers.checkTouching(
            {
              config: state.config,
              isMobileMode: state.isMobileMode,
              spatialGrid: state.spatialGrid,
            },
            symbolObj,
          )
        : null;
      if (touchingSymbol) {
        state.symbolsToRemove.add(symbolObj);
        state.symbolsToRemove.add(touchingSymbol);
      }

      const isOffScreen = SymbolRainHelpers.isSymbolPastRainWindow(
        state,
        symbolObj,
        50,
      );
      const isStuckAtBottom =
        !state.isMobileMode &&
        SymbolRainHelpers.isSymbolPastRainWindow(state, symbolObj, -100) &&
        state.activeFallingSymbols.length > 30;
      const isTouching = state.symbolsToRemove.has(symbolObj);

      if (isOffScreen || isStuckAtBottom || isTouching) {
        SymbolRainHelpers.cleanupSymbolObject({
          symbolObj,
          activeFaceReveals: state.activeFaceReveals,
          symbolPool: state.symbolPool,
          spatialGrid: state.spatialGrid,
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
        SymbolRainHelpers.setSymbolPosition(
          symbolObj.element,
          symbolObj.x,
          symbolObj.y,
        );
      } else {
        symbolObj.y += state.symbolFallSpeed * state.config.collisionSpeedFactor;
        SymbolRainHelpers.setSymbolPosition(
          symbolObj.element,
          symbolObj.x,
          symbolObj.y,
        );
      }

      nextActiveSymbols.push(symbolObj);
      symbolsForGrid.push(symbolObj);
    }

    state.activeFallingSymbols.length = 0;
    state.activeFallingSymbols.push(...nextActiveSymbols);
    state.spatialGrid?.update?.(symbolsForGrid);

    if (state.isInitialPopulation) {
      return;
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

  function stopAnimation(state) {
    state.isAnimationRunning = false;

    if (state.speedControllerId) {
      clearInterval(state.speedControllerId);
      state.speedControllerId = null;
    }

    for (let i = 0; i < state.activeFallingSymbols.length; i++) {
      const symbolObj = state.activeFallingSymbols[i];
      SymbolRainHelpers.cleanupSymbolObject({
        symbolObj,
        activeFaceReveals: state.activeFaceReveals,
        symbolPool: state.symbolPool,
        spatialGrid: state.spatialGrid,
      });
    }
    state.activeFallingSymbols.length = 0;
  }

  function startSpeedController(state) {
    if (state.speedControllerId) {
      return;
    }

    state.speedControllerId = setInterval(() => {
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
    stopAnimation,
    startSpeedController,
    resetSpeed,
  };
})();

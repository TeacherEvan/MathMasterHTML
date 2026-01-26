// js/3rdDISPLAY.js - Symbol Rain Display for Math Game

// PERFORMANCE FIX: Start animation immediately, don't wait for DOMContentLoaded
function initSymbolRain() {
  try {
    const symbolRainContainer = document.getElementById(
      "symbol-rain-container",
    );

    if (!symbolRainContainer) {
      return;
    }

    const symbols = [
      "0",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "X",
      "x",
      "+",
      "-",
      "=",
      "÷",
      "×",
    ];

    // Mobile mode detection
    let isMobileMode =
      window.innerWidth <= 768 ||
      document.body.classList.contains("res-mobile");

    // Configuration - INCREASED DENSITY
    const SymbolRainConfig = {
      // Fall speed
      initialFallSpeed: 0.6,
      maxFallSpeed: 1.2,
      collisionSpeedFactor: 0.5, // Move at 50% speed when colliding
      // Spawn rates
      spawnRate: 0.5,
      burstSpawnRate: 0.15,
      symbolsPerWave: 7,
      waveInterval: 80,
      guaranteedSpawnInterval: 5000,
      // Face reveal
      faceRevealInterval: 5000,
      faceRevealDuration: 1500,
      faceRevealBufferMultiplier: 2.5,
      // Layout
      columnWidth: 50,
      gridCellSize: 100,
      poolSize: 30,
      // Desktop collision (pixels)
      desktopSymbolHeight: 30,
      desktopSymbolWidth: 30,
      desktopCollisionBuffer: 40,
      desktopHorizontalBuffer: 35,
      // Mobile collision (pixels)
      mobileSymbolWidth: 60,
      mobileHorizontalBuffer: 80,
      mobileFaceRevealBuffer: 120,
    };

    let symbolFallSpeed = SymbolRainConfig.initialFallSpeed;
    let isInitialPopulation = true;
    let lastSymbolSpawnTimestamp = {}; // Track spawn times for guaranteed interval
    // Initialize timestamps to prevent immediate mass spawning
    const now = Date.now();
    symbols.forEach((s) => (lastSymbolSpawnTimestamp[s] = now));

    // PERIODIC FACE REVEAL SYSTEM - symbols show enhanced form every 5 seconds
    const faceRevealState = { lastFaceRevealTime: Date.now() };
    const activeFaceReveals = new Set(); // Track symbols currently in face reveal state

    let columnCount = 0;
    let activeFallingSymbols = [];
    let isAnimationRunning = false;
    const symbolsToRemove = new Set(); // Reuse set to avoid per-frame allocations

    // PERFORMANCE: Cache container dimensions to prevent layout thrashing
    let cachedContainerHeight = 0;

    // PERFORMANCE: Tab visibility throttling (saves 95% CPU when tab hidden)
    let isTabVisible = !document.hidden;

    const SymbolRainHelpers = window.SymbolRainHelpers;
    if (!SymbolRainHelpers) {
      console.error("❌ SymbolRainHelpers not loaded");
      return;
    }

    const SpatialGrid = SymbolRainHelpers.createSpatialGrid(SymbolRainConfig);
    const SymbolPool = SymbolRainHelpers.createSymbolPool(SymbolRainConfig);
    const debounce = SymbolRainHelpers.debounce;

    function calculateColumns() {
      const {
        columnCount: newColumnCount,
        containerHeight,
      } = SymbolRainHelpers.calculateColumns(
        symbolRainContainer,
        SymbolRainConfig,
      );
      cachedContainerHeight = containerHeight;
      columnCount = newColumnCount;
    }

    function populateInitialSymbols() {
      SymbolRainHelpers.populateInitialSymbols(
        {
          config: SymbolRainConfig,
          columnCount,
          isMobileMode,
          activeFallingSymbols,
          symbols,
          symbolRainContainer,
          symbolPool: SymbolPool,
          lastSymbolSpawnTimestamp,
        },
        () => {
          isInitialPopulation = false;
        },
      );
    }

    function animateSymbols() {
      // PERFORMANCE: Tab visibility throttling - run at ~1fps when tab hidden
      if (!isTabVisible && Math.random() > 0.016) {
        return; // Skip ~98% of frames when tab is hidden (60fps -> 1fps)
      }

      // PERFORMANCE: Use cached height instead of querying DOM every frame
      const containerHeight = cachedContainerHeight;

      // FACE REVEAL SYSTEM: Check for periodic face reveals every 5 seconds
      const currentTime = Date.now();
      SymbolRainHelpers.triggerFaceRevealIfNeeded(
        {
          activeFallingSymbols,
          activeFaceReveals,
          config: SymbolRainConfig,
        },
        faceRevealState,
        containerHeight,
        currentTime,
      );
      SymbolRainHelpers.cleanupFaceReveals(
        { activeFaceReveals, config: SymbolRainConfig },
        currentTime,
      );

      // PERFORMANCE: Update spatial grid ONCE per frame instead of in every collision check
      SpatialGrid.update(activeFallingSymbols);

      // SAFETY MECHANISM: Track symbols to be removed due to touching
      symbolsToRemove.clear();

      // First pass: Check for symbols that are touching and mark them for removal
      for (let i = 0; i < activeFallingSymbols.length; i++) {
        const symbolObj = activeFallingSymbols[i];

        // Skip if already marked for removal
        if (symbolsToRemove.has(symbolObj)) continue;

        // Check if this symbol is touching another
        const touchingSymbol = SymbolRainHelpers.checkTouching(
          {
            config: SymbolRainConfig,
            isMobileMode,
            spatialGrid: SpatialGrid,
          },
          symbolObj,
        );
        if (touchingSymbol) {
          // Mark both symbols for removal
          symbolsToRemove.add(symbolObj);
          symbolsToRemove.add(touchingSymbol);
        }
      }

      // PERFORMANCE: Swap-and-pop instead of filter() to reuse array and reduce GC pressure
      let writeIndex = 0;
      for (
        let readIndex = 0;
        readIndex < activeFallingSymbols.length;
        readIndex++
      ) {
        const symbolObj = activeFallingSymbols[readIndex];

        // Check if symbol should be removed (out of bounds or stuck at bottom)
        // Remove symbols more aggressively if they're near bottom and moving slowly
        const isOffScreen = symbolObj.y > containerHeight + 50;
        const isStuckAtBottom =
          symbolObj.y > containerHeight - 100 &&
          activeFallingSymbols.length > 30; // Remove stuck symbols when screen is crowded
        const isTouching = symbolsToRemove.has(symbolObj); // SAFETY MECHANISM: Remove if touching

        if (isOffScreen || isStuckAtBottom || isTouching) {
          SymbolRainHelpers.cleanupSymbolObject({
            symbolObj,
            activeFaceReveals,
            symbolPool: SymbolPool,
          });
          continue; // Skip this symbol, don't copy to writeIndex
        }

        // Update position - symbols move slower when near others instead of stopping completely
        if (
          !SymbolRainHelpers.checkCollision(
            {
              config: SymbolRainConfig,
              isMobileMode,
              spatialGrid: SpatialGrid,
            },
            symbolObj,
          )
        ) {
          // No collision - move at full speed
          symbolObj.y += symbolFallSpeed;
          symbolObj.element.style.top = `${symbolObj.y}px`;
        } else {
          // Collision detected - move at reduced speed to prevent pile-up
          symbolObj.y +=
            symbolFallSpeed * SymbolRainConfig.collisionSpeedFactor;
          symbolObj.element.style.top = `${symbolObj.y}px`;
        }

        // Keep this symbol - copy to writeIndex
        activeFallingSymbols[writeIndex++] = symbolObj;
      }
      // Trim array to new length (no reallocation!)
      activeFallingSymbols.length = writeIndex;

      // Skip random spawning during initial population phase
      if (isInitialPopulation) {
        return; // Let wave-based spawn handle initial population
      }

      // Normal random spawning - optimized to reduce array iterations
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        if (
          Math.random() < SymbolRainConfig.spawnRate &&
          !SymbolRainHelpers.isColumnCrowded(activeFallingSymbols, columnIndex)
        ) {
          const randomSymbol =
            symbols[Math.floor(Math.random() * symbols.length)];
          SymbolRainHelpers.createFallingSymbol(
            {
              symbols,
              symbolRainContainer,
              config: SymbolRainConfig,
              activeFallingSymbols,
              symbolPool: SymbolPool,
              lastSymbolSpawnTimestamp,
            },
            {
              column: columnIndex,
              isInitialPopulation: false,
              forcedSymbol: randomSymbol,
            },
          );
        }
      }

      // BURST SPAWNING: Occasionally spawn 2-3 symbols simultaneously in different columns
      if (Math.random() < SymbolRainConfig.burstSpawnRate) {
        const burstSymbolCount = 2 + Math.floor(Math.random() * 2); // 2-3 symbols

        // Find columns that aren't crowded - reuse helper function
        const availableColumnIndices = [];
        for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
          if (
            !SymbolRainHelpers.isColumnCrowded(
              activeFallingSymbols,
              columnIndex,
            )
          ) {
            availableColumnIndices.push(columnIndex);
          }
        }

        // Spawn burst symbols in random available columns
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
          )[0]; // Remove selected column
          const randomSymbol =
            symbols[Math.floor(Math.random() * symbols.length)];
          SymbolRainHelpers.createFallingSymbol(
            {
              symbols,
              symbolRainContainer,
              config: SymbolRainConfig,
              activeFallingSymbols,
              symbolPool: SymbolPool,
              lastSymbolSpawnTimestamp,
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

    function startAnimation() {
      if (isAnimationRunning) return;
      isAnimationRunning = true;
      function loop() {
        if (isAnimationRunning) {
          animateSymbols();
          requestAnimationFrame(loop);
        }
      }
      loop();
    }

    function startSpeedController() {
      setInterval(() => {
        if (!isMobileMode && symbolFallSpeed < SymbolRainConfig.maxFallSpeed) {
          symbolFallSpeed *= 1.1; // Increase by 10% every minute
        }
      }, 60000); // Every 60 seconds (1 minute)
    }

    // Reset speed when problem completes
    function resetSpeed() {
      symbolFallSpeed = SymbolRainConfig.initialFallSpeed;
    }

    // Listen for problem completion to reset speed
    document.addEventListener("problemCompleted", () => {
      resetSpeed();
    });

    // PERFORMANCE: Check guaranteed spawns every 1 second instead of 60x per second
    function startGuaranteedSpawnController() {
      setInterval(() => {
        const currentTimestamp = Date.now();
        symbols.forEach((symbolChar) => {
          if (
            currentTimestamp - lastSymbolSpawnTimestamp[symbolChar] >
            SymbolRainConfig.guaranteedSpawnInterval
          ) {
            const randomColumnIndex = Math.floor(Math.random() * columnCount);
            SymbolRainHelpers.createFallingSymbol(
              {
                symbols,
                symbolRainContainer,
                config: SymbolRainConfig,
                activeFallingSymbols,
                symbolPool: SymbolPool,
                lastSymbolSpawnTimestamp,
              },
              {
                column: randomColumnIndex,
                isInitialPopulation: false,
                forcedSymbol: symbolChar,
              },
            );
          }
        });
      }, 1000); // Check once per second
    }

    // Initialize

    // PERFORMANCE + TOUCH FIX: Use pointerdown for instant response (no 300ms delay)
    // Pointer Events API unifies mouse, touch, and pen input
    let isPointerCurrentlyDown = false;
    let _lastClickedFallingSymbol = null; // Prefixed: tracked for potential future debugging

    symbolRainContainer.addEventListener(
      "pointerdown",
      (event) => {
        // Prevent accidental double-handling
        if (isPointerCurrentlyDown) return;
        isPointerCurrentlyDown = true;

        const fallingSymbolElement = event.target.closest(".falling-symbol");
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          // Prevent default to avoid click delay and text selection
          event.preventDefault();
          _lastClickedFallingSymbol = fallingSymbolElement;
          SymbolRainHelpers.handleSymbolClick(
            {
              activeFallingSymbols,
              symbolPool: SymbolPool,
              activeFaceReveals,
            },
            fallingSymbolElement,
            event,
          );
        }
      },
      { passive: false },
    ); // Non-passive to allow preventDefault

    symbolRainContainer.addEventListener("pointerup", () => {
      isPointerCurrentlyDown = false;
      _lastClickedFallingSymbol = null;
    });

    // Prevent pointer cancel from breaking the interaction
    symbolRainContainer.addEventListener("pointercancel", () => {
      isPointerCurrentlyDown = false;
      _lastClickedFallingSymbol = null;
    });

    // Fallback for older browsers that don't support Pointer Events
    if (!window.PointerEvent) {
      symbolRainContainer.addEventListener("click", (event) => {
        const fallingSymbolElement = event.target.closest(".falling-symbol");
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          SymbolRainHelpers.handleSymbolClick(
            {
              activeFallingSymbols,
              symbolPool: SymbolPool,
              activeFaceReveals,
            },
            fallingSymbolElement,
            event,
          );
        }
      });
    }

    calculateColumns();
    populateInitialSymbols();
    startAnimation();
    startSpeedController();
    startGuaranteedSpawnController();

    // PERFORMANCE: Tab visibility API - throttle animation when tab hidden
    document.addEventListener("visibilitychange", () => {
      isTabVisible = !document.hidden;
    });

    // PERFORMANCE: Debounced resize handler (250ms delay prevents excessive recalculation)
    const debouncedResize = debounce(() => {
      isMobileMode =
        window.innerWidth <= 768 ||
        document.body.classList.contains("res-mobile");
      calculateColumns();
    }, 250);

    window.addEventListener("resize", debouncedResize);

    // Listen for display resolution changes
    document.addEventListener("displayResolutionChanged", (event) => {
      const isMobile = event.detail.name === "mobile";
      isMobileMode = isMobile;
    });
    // Expose symbol count for performance monitoring
    window.getActiveSymbolCount = function() {
      return activeFallingSymbols.length;
    };
  } catch (e) {
    console.error("Symbol Rain init error:", e);
  }
}

// PERFORMANCE FIX: Call initSymbolRain as soon as DOM is interactive (earlier than DOMContentLoaded)
if (document.readyState === "loading") {
  // DOM still loading - wait for interactive state
  document.addEventListener("DOMContentLoaded", initSymbolRain);
} else {
  // DOM already loaded - start immediately
  initSymbolRain();
}

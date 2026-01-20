// js/3rdDISPLAY.js - Symbol Rain Display for Math Game

// PERFORMANCE FIX: Start animation immediately, don't wait for DOMContentLoaded
function initSymbolRain() {
  const symbolRainContainer = document.getElementById("symbol-rain-container");

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
    window.innerWidth <= 768 || document.body.classList.contains("res-mobile");

  // Configuration - INCREASED DENSITY
  let symbolFallSpeed = 0.6;
  const INITIAL_FALL_SPEED = 0.6; // Store initial speed for reset
  const maxFallSpeed = 1.2; // 100% more than default (2x)
  const spawnRate = 0.5; // INCREASED from 0.3 to 0.5 (67% more symbols)
  const burstSpawnRate = 0.15; // INCREASED from 0.1 to 0.15 (50% more bursts)
  const columnWidth = 50;

  // Wave-based spawn system for initial population - INCREASED DENSITY
  const SYMBOLS_PER_WAVE = 7; // INCREASED from 5 to 7 symbols at a time (40% more)
  const WAVE_INTERVAL = 80; // REDUCED from 110 to 80ms (27% faster waves)
  let isInitialPopulation = true; // Flag to disable random spawning during startup

  // Guaranteed spawn system - ensure all symbols appear every 5 seconds
  const lastSymbolSpawnTimestamp = {};
  symbols.forEach((symbolChar) => {
    lastSymbolSpawnTimestamp[symbolChar] = Date.now() - Math.random() * 2000;
  });
  const GUARANTEED_SPAWN_INTERVAL_MS = 5000; // 5 seconds

  // PERIODIC FACE REVEAL SYSTEM - symbols show enhanced form every 5 seconds
  const FACE_REVEAL_INTERVAL_MS = 5000; // 5 seconds
  const FACE_REVEAL_DURATION_MS = 1500; // 1.5 seconds reveal duration
  let lastFaceRevealTime = Date.now();
  const activeFaceReveals = new Set(); // Track symbols currently in face reveal state

  let columnCount = 0;
  let activeFallingSymbols = [];
  let isAnimationRunning = false;

  // PERFORMANCE: Cache container dimensions to prevent layout thrashing
  let cachedContainerHeight = 0;

  // PERFORMANCE: Tab visibility throttling (saves 95% CPU when tab hidden)
  let isTabVisible = !document.hidden;

  // PERFORMANCE: DOM element pooling to reduce GC pressure
  const symbolPool = [];
  const POOL_SIZE = 30;

  // PERFORMANCE: Spatial hash grid for O(n) collision detection instead of O(n²)
  const GRID_CELL_SIZE = 100; // 100px cells
  const spatialGrid = new Map();

  // PERFORMANCE: Debounce utility to prevent excessive function calls
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function getCellKey(x, y) {
    const cellX = Math.floor(x / GRID_CELL_SIZE);
    const cellY = Math.floor(y / GRID_CELL_SIZE);
    return `${cellX},${cellY}`;
  }

  function updateSpatialGrid() {
    spatialGrid.clear();
    activeFallingSymbols.forEach((symbolObj) => {
      const key = getCellKey(symbolObj.x, symbolObj.y);
      if (!spatialGrid.has(key)) {
        spatialGrid.set(key, []);
      }
      spatialGrid.get(key).push(symbolObj);
    });
  }

  function getNeighborCells(x, y) {
    const cellX = Math.floor(x / GRID_CELL_SIZE);
    const cellY = Math.floor(y / GRID_CELL_SIZE);
    const neighbors = [];

    // Check current cell and 8 surrounding cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        if (spatialGrid.has(key)) {
          neighbors.push(...spatialGrid.get(key));
        }
      }
    }
    return neighbors;
  }

  function calculateColumns() {
    const containerWidth = symbolRainContainer.offsetWidth;
    cachedContainerHeight = symbolRainContainer.offsetHeight; // Cache height here
    columnCount = Math.floor(containerWidth / columnWidth);
  }

  // PERFORMANCE: Get symbol from pool or create new one
  function getSymbolFromPool() {
    if (symbolPool.length > 0) {
      const symbol = symbolPool.pop();
      symbol.style.display = "block";
      return symbol;
    }
    // Create new element if pool is empty
    const symbol = document.createElement("div");
    symbol.className = "falling-symbol";
    return symbol;
  }

  // PERFORMANCE: Return symbol to pool for reuse
  function returnSymbolToPool(symbolElement) {
    if (symbolPool.length < POOL_SIZE) {
      symbolElement.style.display = "none";
      symbolElement.className = "falling-symbol"; // Reset classes
      symbolPool.push(symbolElement);
    } else {
      symbolElement.remove(); // Pool full, discard
    }
  }

  // DESKTOP: Create falling symbol (vertical)
  function createFallingSymbol(
    column,
    isInitialPopulation = false,
    forcedSymbol = null,
  ) {
    const symbol = getSymbolFromPool(); // Use pooled element
    symbol.className = "falling-symbol";
    symbol.textContent =
      forcedSymbol || symbols[Math.floor(Math.random() * symbols.length)];
    // FIX: Center the random offset around column position to prevent right-side bias
    const horizontalOffset = (Math.random() - 0.5) * 40; // -20px to +20px
    symbol.style.left =
      column * columnWidth + columnWidth / 2 + horizontalOffset + "px";

    if (isInitialPopulation) {
      symbol.style.top = `${Math.random() *
        symbolRainContainer.offsetHeight}px`;
    } else {
      symbol.style.top = "-50px";
    }

    // PERFORMANCE: Event delegation - no listener needed per symbol!
    // Container handles all clicks via event delegation (see init section)
    symbolRainContainer.appendChild(symbol);

    activeFallingSymbols.push({
      element: symbol,
      column: column,
      y: isInitialPopulation ? parseFloat(symbol.style.top) : -50,
      x: parseFloat(symbol.style.left),
      symbol: symbol.textContent,
      isInFaceReveal: false, // FACE REVEAL: Track if symbol is in enhanced reveal state
      faceRevealStartTime: 0, // FACE REVEAL: When the reveal started
    });

    if (forcedSymbol) {
      lastSymbolSpawnTimestamp[forcedSymbol] = Date.now();
    }
  }

  function populateInitialSymbols() {
    // Wave-based spawn: Release 5 symbols at a time, evenly spread out
    const totalWaves = isMobileMode ? 4 : 8; // Mobile: 4 waves (20 symbols), Desktop: 8 waves (40 symbols)

    function spawnWave(waveNumber) {
      if (waveNumber >= totalWaves) {
        isInitialPopulation = false; // Enable random spawning
        return;
      }

      // Evenly distribute symbols across columnCount
      const columnsToUse = Math.min(columnCount, SYMBOLS_PER_WAVE); // Don't exceed available columnCount
      const columnStep = Math.floor(columnCount / columnsToUse);

      for (let i = 0; i < SYMBOLS_PER_WAVE && i < columnCount; i++) {
        const column = (i * columnStep) % columnCount; // Evenly distribute
        createFallingSymbol(column, true);
      }

      // Schedule next wave
      setTimeout(() => spawnWave(waveNumber + 1), WAVE_INTERVAL);
    }

    // Start the wave spawn sequence
    spawnWave(0);
  }

  function handleSymbolClick(symbolElement, event) {
    // Quick validation check
    if (!document.getElementById("panel-c").contains(event.target)) {
      return;
    }

    // Prevent multiple clicks on same symbol
    if (symbolElement.classList.contains("clicked")) {
      return;
    }

    const clickedSymbol = symbolElement.textContent;

    // INSTANT FEEDBACK: Apply clicked class immediately
    symbolElement.classList.add("clicked");

    // Dispatch event immediately (no delay)
    document.dispatchEvent(
      new CustomEvent("symbolClicked", { detail: { symbol: clickedSymbol } }),
    );

    // Remove from DOM and clean up after animation
    setTimeout(() => {
      if (symbolElement.parentNode) {
        symbolElement.parentNode.removeChild(symbolElement);
      }
      activeFallingSymbols = activeFallingSymbols.filter(
        (s) => s.element !== symbolElement,
      );
      // PERFORMANCE: Return element to pool for reuse
      returnSymbolToPool(symbolElement);
    }, 500);
  }

  function checkCollision(symbolObj) {
    if (isMobileMode) {
      // Mobile: Check horizontal spacing - INCREASED BUFFER for face reveal symbols
      const symbolWidth = 60;
      const baseHorizontalBuffer = 80; // Space between symbols in train
      const faceRevealBuffer = symbolObj.isInFaceReveal ? 120 : 0; // Extra space for face reveal
      const horizontalBuffer = baseHorizontalBuffer + faceRevealBuffer;

      // PERFORMANCE: Only check nearby symbols from spatial grid
      const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;
        const distance = symbolObj.x - other.x;
        if (distance > 0 && distance < symbolWidth + horizontalBuffer) {
          return true;
        }
      }
      return false;
    } else {
      // Desktop: Check vertical collision with increased spacing - ENHANCED for face reveal
      const symbolHeight = 30;
      const symbolWidth = 30;
      const baseCollisionBuffer = 40;
      const baseHorizontalBuffer = 35;

      // FACE REVEAL: Increased buffers to prevent overlaps during reveal phases
      const faceRevealMultiplier = symbolObj.isInFaceReveal ? 2.5 : 1; // 2.5x buffer when revealing
      const collisionBuffer = baseCollisionBuffer * faceRevealMultiplier;
      const horizontalBuffer = baseHorizontalBuffer * faceRevealMultiplier;

      const symbolLeft = symbolObj.x;
      const symbolRight = symbolLeft + symbolWidth;

      // PERFORMANCE: Only check nearby symbols from spatial grid (not ALL symbols!)
      const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;

        const otherLeft = other.x;
        const otherRight = otherLeft + symbolWidth;

        const horizontalOverlap = !(
          symbolRight + horizontalBuffer < otherLeft ||
          symbolLeft > otherRight + horizontalBuffer
        );

        if (horizontalOverlap) {
          const distance = other.y - symbolObj.y;
          if (distance > 0 && distance < symbolHeight + collisionBuffer) {
            return true;
          }
        }
      }
      return false;
    }
  }

  // SAFETY MECHANISM: Check if two symbols are actually touching (overlapping)
  function checkTouching(symbolObj) {
    if (isMobileMode) {
      // Mobile: Check actual overlap (no buffer)
      const symbolWidth = 60;

      const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;

        // Check if symbols are actually overlapping horizontally
        const distance = Math.abs(symbolObj.x - other.x);
        if (distance < symbolWidth) {
          return other; // Return the colliding symbol
        }
      }
      return null;
    } else {
      // Desktop: Check actual overlap (no buffer) - both vertical and horizontal
      const symbolHeight = 30;
      const symbolWidth = 30;

      const symbolLeft = symbolObj.x;
      const symbolRight = symbolLeft + symbolWidth;
      const symbolTop = symbolObj.y;
      const symbolBottom = symbolTop + symbolHeight;

      const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;

        const otherLeft = other.x;
        const otherRight = otherLeft + symbolWidth;
        const otherTop = other.y;
        const otherBottom = otherTop + symbolHeight;

        // Check for actual bounding box overlap
        const horizontalOverlap = !(
          symbolRight <= otherLeft || symbolLeft >= otherRight
        );
        const verticalOverlap = !(
          symbolBottom <= otherTop || symbolTop >= otherBottom
        );

        if (horizontalOverlap && verticalOverlap) {
          return other; // Return the colliding symbol
        }
      }
      return null;
    }
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
    if (currentTime - lastFaceRevealTime >= FACE_REVEAL_INTERVAL_MS) {
      // Trigger face reveal for a random selection of visible symbols
      const visibleSymbols = activeFallingSymbols.filter(
        (s) => s.y > 0 && s.y < containerHeight,
      );
      if (visibleSymbols.length > 0) {
        // Reveal 3-5 symbols at once for dramatic effect
        const revealCount = Math.min(
          3 + Math.floor(Math.random() * 3),
          visibleSymbols.length,
        );
        for (let i = 0; i < revealCount; i++) {
          const randomIndex = Math.floor(Math.random() * visibleSymbols.length);
          const symbolObj = visibleSymbols.splice(randomIndex, 1)[0]; // Remove to avoid double selection

          if (!symbolObj.isInFaceReveal) {
            symbolObj.isInFaceReveal = true;
            symbolObj.faceRevealStartTime = currentTime;
            activeFaceReveals.add(symbolObj);

            // Apply face reveal styling
            symbolObj.element.classList.add("face-reveal");
            symbolObj.element.style.transform = "scale(1.3)";
            symbolObj.element.style.textShadow =
              "0 0 20px #0ff, 0 0 40px #0ff, 0 0 60px #0ff";
            symbolObj.element.style.filter = "brightness(1.5)";
          }
        }
      }
      lastFaceRevealTime = currentTime;
    }

    // FACE REVEAL: Clean up expired face reveals
    for (const symbolObj of activeFaceReveals) {
      if (
        currentTime - symbolObj.faceRevealStartTime >=
        FACE_REVEAL_DURATION_MS
      ) {
        symbolObj.isInFaceReveal = false;
        symbolObj.element.classList.remove("face-reveal");
        symbolObj.element.style.transform = "";
        symbolObj.element.style.textShadow = "";
        symbolObj.element.style.filter = "";
        activeFaceReveals.delete(symbolObj);
      }
    }

    // PERFORMANCE: Update spatial grid ONCE per frame instead of in every collision check
    updateSpatialGrid();

    // SAFETY MECHANISM: Track symbols to be removed due to touching
    const symbolsToRemove = new Set();

    // First pass: Check for symbols that are touching and mark them for removal
    for (let i = 0; i < activeFallingSymbols.length; i++) {
      const symbolObj = activeFallingSymbols[i];

      // Skip if already marked for removal
      if (symbolsToRemove.has(symbolObj)) continue;

      // Check if this symbol is touching another
      const touchingSymbol = checkTouching(symbolObj);
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
        symbolObj.y > containerHeight - 100 && activeFallingSymbols.length > 30; // Remove stuck symbols when screen is crowded
      const isTouching = symbolsToRemove.has(symbolObj); // SAFETY MECHANISM: Remove if touching

      if (isOffScreen || isStuckAtBottom || isTouching) {
        symbolObj.element.remove();
        returnSymbolToPool(symbolObj.element); // Return to pool
        continue; // Skip this symbol, don't copy to writeIndex
      }

      // Update position - symbols move slower when near others instead of stopping completely
      if (!checkCollision(symbolObj)) {
        // No collision - move at full speed
        symbolObj.y += symbolFallSpeed;
        symbolObj.element.style.top = `${symbolObj.y}px`;
      } else {
        // Collision detected - move at reduced speed to prevent pile-up
        symbolObj.y += symbolFallSpeed * 0.5; // INCREASED from 30% to 50% speed to reduce accumulation
        symbolObj.element.style.top = `${symbolObj.y}px`;
      }

      // Keep this symbol - copy to writeIndex
      activeFallingSymbols[writeIndex++] = symbolObj;
    }
    // Trim array to new length (no reallocation!)
    activeFallingSymbols.length = writeIndex;

    // PERFORMANCE: Helper to check if column is crowded (extract to avoid duplication)
    function isColumnCrowded(targetColumnIndex) {
      for (
        let symbolIndex = 0;
        symbolIndex < activeFallingSymbols.length;
        symbolIndex++
      ) {
        const currentSymbol = activeFallingSymbols[symbolIndex];
        if (
          currentSymbol.column === targetColumnIndex &&
          currentSymbol.y < 40
        ) {
          return true;
        }
      }
      return false;
    }

    // Skip random spawning during initial population phase
    if (isInitialPopulation) {
      return; // Let wave-based spawn handle initial population
    }

    // Normal random spawning - optimized to reduce array iterations
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      if (Math.random() < spawnRate && !isColumnCrowded(columnIndex)) {
        const randomSymbol =
          symbols[Math.floor(Math.random() * symbols.length)];
        createFallingSymbol(columnIndex, false, randomSymbol);
      }
    }

    // BURST SPAWNING: Occasionally spawn 2-3 symbols simultaneously in different columns
    if (Math.random() < burstSpawnRate) {
      const burstSymbolCount = 2 + Math.floor(Math.random() * 2); // 2-3 symbols

      // Find columns that aren't crowded - reuse helper function
      const availableColumnIndices = [];
      for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
        if (!isColumnCrowded(columnIndex)) {
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
        createFallingSymbol(selectedColumnIndex, false, randomSymbol);
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
      if (!isMobileMode && symbolFallSpeed < maxFallSpeed) {
        symbolFallSpeed *= 1.1; // Increase by 10% every minute
      }
    }, 60000); // Every 60 seconds (1 minute)
  }

  // Reset speed when problem completes
  function resetSpeed() {
    symbolFallSpeed = INITIAL_FALL_SPEED;
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
          GUARANTEED_SPAWN_INTERVAL_MS
        ) {
          const randomColumnIndex = Math.floor(Math.random() * columnCount);
          createFallingSymbol(randomColumnIndex, false, symbolChar);
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
        handleSymbolClick(fallingSymbolElement, event);
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
        handleSymbolClick(fallingSymbolElement, event);
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
}

// PERFORMANCE FIX: Call initSymbolRain as soon as DOM is interactive (earlier than DOMContentLoaded)
if (document.readyState === "loading") {
  // DOM still loading - wait for interactive state
  document.addEventListener("DOMContentLoaded", initSymbolRain);
} else {
  // DOM already loaded - start immediately
  initSymbolRain();
}

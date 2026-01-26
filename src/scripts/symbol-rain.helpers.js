// src/scripts/symbol-rain.helpers.js - Symbol rain helper utilities
console.log("🎯 SymbolRain helpers loading...");

(function attachSymbolRainHelpers() {
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

  function createSpatialGrid(config) {
    const spatialGrid = new Map();

    return {
      getCellKey(x, y) {
        const cellX = Math.floor(x / config.gridCellSize);
        const cellY = Math.floor(y / config.gridCellSize);
        return `${cellX},${cellY}`;
      },

      update(activeSymbols) {
        spatialGrid.clear();
        activeSymbols.forEach((symbolObj) => {
          const key = this.getCellKey(symbolObj.x, symbolObj.y);
          if (!spatialGrid.has(key)) {
            spatialGrid.set(key, []);
          }
          spatialGrid.get(key).push(symbolObj);
        });
      },

      getNeighbors(x, y) {
        const cellX = Math.floor(x / config.gridCellSize);
        const cellY = Math.floor(y / config.gridCellSize);
        const neighbors = [];

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${cellX + dx},${cellY + dy}`;
            if (spatialGrid.has(key)) {
              neighbors.push(...spatialGrid.get(key));
            }
          }
        }
        return neighbors;
      },
    };
  }

  function createSymbolPool(config) {
    return {
      pool: [],

      get() {
        if (this.pool.length > 0) {
          const symbol = this.pool.pop();
          symbol.style.display = "block";
          return symbol;
        }
        const symbol = document.createElement("div");
        symbol.className = "falling-symbol";
        return symbol;
      },

      release(symbolElement) {
        if (this.pool.length < config.poolSize) {
          symbolElement.style.display = "none";
          symbolElement.className = "falling-symbol";
          this.pool.push(symbolElement);
        } else {
          symbolElement.remove();
        }
      },
    };
  }

  function calculateColumns(container, config) {
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const columnCount = Math.floor(containerWidth / config.columnWidth);
    return { columnCount, containerHeight };
  }

  function resetFaceRevealStyles(symbolElement) {
    symbolElement.classList.remove("face-reveal");
    symbolElement.style.transform = "";
    symbolElement.style.textShadow = "";
    symbolElement.style.filter = "";
  }

  function applyFaceRevealStyles(symbolElement) {
    symbolElement.classList.add("face-reveal");
    symbolElement.style.transform = "scale(1.3)";
    symbolElement.style.textShadow =
      "0 0 20px #0ff, 0 0 40px #0ff, 0 0 60px #0ff";
    symbolElement.style.filter = "brightness(1.5)";
  }

  function cleanupSymbolObject({ symbolObj, activeFaceReveals, symbolPool }) {
    if (activeFaceReveals.has(symbolObj)) {
      activeFaceReveals.delete(symbolObj);
      resetFaceRevealStyles(symbolObj.element);
    }
    symbolObj.element.remove();
    symbolPool.release(symbolObj.element);
  }

  function createFallingSymbol(
    {
      symbols,
      symbolRainContainer,
      config,
      activeFallingSymbols,
      symbolPool,
      lastSymbolSpawnTimestamp,
    },
    { column, isInitialPopulation = false, forcedSymbol = null },
  ) {
    const symbol = symbolPool.get();
    symbol.className = "falling-symbol";
    symbol.textContent =
      forcedSymbol || symbols[Math.floor(Math.random() * symbols.length)];

    const horizontalOffset = (Math.random() - 0.5) * 40;
    symbol.style.left =
      column * config.columnWidth +
      config.columnWidth / 2 +
      horizontalOffset +
      "px";

    if (isInitialPopulation) {
      symbol.style.top = `${Math.random() *
        symbolRainContainer.offsetHeight}px`;
    } else {
      symbol.style.top = "-50px";
    }

    symbolRainContainer.appendChild(symbol);

    activeFallingSymbols.push({
      element: symbol,
      column: column,
      y: isInitialPopulation ? parseFloat(symbol.style.top) : -50,
      x: parseFloat(symbol.style.left),
      symbol: symbol.textContent,
      isInFaceReveal: false,
      faceRevealStartTime: 0,
    });

    if (forcedSymbol) {
      lastSymbolSpawnTimestamp[forcedSymbol] = Date.now();
    }
  }

  function populateInitialSymbols(
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
        createFallingSymbol(
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
  }

  function handleSymbolClick(
    { activeFallingSymbols, symbolPool, activeFaceReveals },
    symbolElement,
    event,
  ) {
    if (!document.getElementById("panel-c").contains(event.target)) {
      return;
    }

    if (symbolElement.classList.contains("clicked")) {
      return;
    }

    const clickedSymbol = symbolElement.textContent;
    symbolElement.classList.add("clicked");

    document.dispatchEvent(
      new CustomEvent("symbolClicked", { detail: { symbol: clickedSymbol } }),
    );

    setTimeout(() => {
      const symbolObj = activeFallingSymbols.find(
        (s) => s.element === symbolElement,
      );
      if (symbolObj) {
        const symbolIndex = activeFallingSymbols.indexOf(symbolObj);
        if (symbolIndex !== -1) {
          activeFallingSymbols.splice(symbolIndex, 1);
        }
        cleanupSymbolObject({
          symbolObj,
          activeFaceReveals,
          symbolPool,
        });
        return;
      }
      if (symbolElement.parentNode) {
        symbolElement.parentNode.removeChild(symbolElement);
      }
      symbolPool.release(symbolElement);
    }, 500);
  }

  function checkCollision({ config, isMobileMode, spatialGrid }, symbolObj) {
    if (isMobileMode) {
      const symbolWidth = config.mobileSymbolWidth;
      const baseHorizontalBuffer = config.mobileHorizontalBuffer;
      const faceRevealBuffer = symbolObj.isInFaceReveal
        ? config.mobileFaceRevealBuffer
        : 0;
      const horizontalBuffer = baseHorizontalBuffer + faceRevealBuffer;

      const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;
        const distance = symbolObj.x - other.x;
        if (distance > 0 && distance < symbolWidth + horizontalBuffer) {
          return true;
        }
      }
      return false;
    }

    const symbolHeight = config.desktopSymbolHeight;
    const symbolWidth = config.desktopSymbolWidth;
    const baseCollisionBuffer = config.desktopCollisionBuffer;
    const baseHorizontalBuffer = config.desktopHorizontalBuffer;

    const faceRevealMultiplier = symbolObj.isInFaceReveal
      ? config.faceRevealBufferMultiplier
      : 1;
    const collisionBuffer = baseCollisionBuffer * faceRevealMultiplier;
    const horizontalBuffer = baseHorizontalBuffer * faceRevealMultiplier;

    const symbolLeft = symbolObj.x;
    const symbolRight = symbolLeft + symbolWidth;

    const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
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

  function checkTouching({ config, isMobileMode, spatialGrid }, symbolObj) {
    if (isMobileMode) {
      const symbolWidth = config.mobileSymbolWidth;

      const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;

        const distance = Math.abs(symbolObj.x - other.x);
        if (distance < symbolWidth) {
          return other;
        }
      }
      return null;
    }

    const symbolHeight = config.desktopSymbolHeight;
    const symbolWidth = config.desktopSymbolWidth;

    const symbolLeft = symbolObj.x;
    const symbolRight = symbolLeft + symbolWidth;
    const symbolTop = symbolObj.y;
    const symbolBottom = symbolTop + symbolHeight;

    const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
    for (const other of neighbors) {
      if (other === symbolObj) continue;

      const otherLeft = other.x;
      const otherRight = otherLeft + symbolWidth;
      const otherTop = other.y;
      const otherBottom = otherTop + symbolHeight;

      const horizontalOverlap = !(
        symbolRight <= otherLeft || symbolLeft >= otherRight
      );
      const verticalOverlap = !(
        symbolBottom <= otherTop || symbolTop >= otherBottom
      );

      if (horizontalOverlap && verticalOverlap) {
        return other;
      }
    }
    return null;
  }

  function isColumnCrowded(activeFallingSymbols, targetColumnIndex) {
    for (
      let symbolIndex = 0;
      symbolIndex < activeFallingSymbols.length;
      symbolIndex++
    ) {
      const currentSymbol = activeFallingSymbols[symbolIndex];
      if (currentSymbol.column === targetColumnIndex && currentSymbol.y < 40) {
        return true;
      }
    }
    return false;
  }

  function triggerFaceRevealIfNeeded(
    { activeFallingSymbols, activeFaceReveals, config },
    state,
    containerHeight,
    currentTime,
  ) {
    if (currentTime - state.lastFaceRevealTime < config.faceRevealInterval) {
      return;
    }

    const visibleSymbols = activeFallingSymbols.filter(
      (s) => s.y > 0 && s.y < containerHeight,
    );
    if (visibleSymbols.length === 0) {
      state.lastFaceRevealTime = currentTime;
      return;
    }

    const revealCount = Math.min(
      3 + Math.floor(Math.random() * 3),
      visibleSymbols.length,
    );
    for (let i = 0; i < revealCount; i++) {
      const randomIndex = Math.floor(Math.random() * visibleSymbols.length);
      const symbolObj = visibleSymbols.splice(randomIndex, 1)[0];

      if (!symbolObj.isInFaceReveal) {
        symbolObj.isInFaceReveal = true;
        symbolObj.faceRevealStartTime = currentTime;
        activeFaceReveals.add(symbolObj);
        applyFaceRevealStyles(symbolObj.element);
      }
    }
    state.lastFaceRevealTime = currentTime;
  }

  function cleanupFaceReveals({ activeFaceReveals, config }, currentTime) {
    for (const symbolObj of activeFaceReveals) {
      if (
        currentTime - symbolObj.faceRevealStartTime >=
        config.faceRevealDuration
      ) {
        symbolObj.isInFaceReveal = false;
        resetFaceRevealStyles(symbolObj.element);
        activeFaceReveals.delete(symbolObj);
      }
    }
  }

  window.SymbolRainHelpers = {
    debounce,
    createSpatialGrid,
    createSymbolPool,
    calculateColumns,
    cleanupSymbolObject,
    createFallingSymbol,
    populateInitialSymbols,
    handleSymbolClick,
    checkCollision,
    checkTouching,
    isColumnCrowded,
    triggerFaceRevealIfNeeded,
    cleanupFaceReveals,
  };
})();

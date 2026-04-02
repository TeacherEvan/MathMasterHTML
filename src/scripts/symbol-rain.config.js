(function () {
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

  const config = {
    // Fall speed
    initialFallSpeed: 0.6,
    maxFallSpeed: 1.2,
    collisionSpeedFactor: 0.5,
    // Spawn rates
    spawnRate: 0.5,
    burstSpawnRate: 0.15,
    symbolsPerWave: 14,
    waveInterval: 80,
    guaranteedSpawnInterval: 5000,
    // Face reveal
    faceRevealInterval: 5000,
    faceRevealDuration: 1500,
    faceRevealBufferMultiplier: 2.5,
    // Layout
    columnWidth: 50,
    gridCellSize: 100,
    poolSize: 60,
    maxActiveSymbols: 200,
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

  if (window.__PERF_SMOKE_MODE === true) {
    config.initialFallSpeed = 0.35;
    config.maxFallSpeed = 0.55;
    config.spawnRate = 0;
    config.burstSpawnRate = 0;
    config.symbolsPerWave = 0;
    config.waveInterval = 600;
    config.guaranteedSpawnInterval = 20000;
    config.faceRevealInterval = 15000;
    config.poolSize = 1;
    config.maxActiveSymbols = 0;
  }

  window.SymbolRainSymbols = symbols;
  window.SymbolRainConfig = config;
})();

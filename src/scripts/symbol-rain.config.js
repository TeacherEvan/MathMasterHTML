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
    // Layout
    columnWidth: 50,
    gridCellSize: 100,
    poolSize: 60,
    maxActiveSymbols: 200,
    // Unified Base collision (pixels)
    symbolHeight: 42,
    symbolWidth: 60,
    collisionBuffer: 28,
    horizontalBuffer: 80,
    faceRevealBuffer: 120,
  };

  if (window.__PERF_SMOKE_MODE === true) {
    config.initialFallSpeed = 0.35;
    config.maxFallSpeed = 0.55;
    config.spawnRate = 0.01;
    config.burstSpawnRate = 0;
    config.symbolsPerWave = 1;
    config.waveInterval = 1800;
    config.guaranteedSpawnInterval = 30000;
    config.faceRevealInterval = 15000;
    config.poolSize = 4;
    config.maxActiveSymbols = 2;
  }

  window.SymbolRainSymbols = symbols;
  window.SymbolRainConfig = config;
})();

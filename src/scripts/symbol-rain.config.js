(function() {
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

  window.SymbolRainSymbols = symbols;
  window.SymbolRainConfig = config;
})();

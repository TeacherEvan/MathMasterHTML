// Quality tier constants
window.QUALITY_TIERS = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  ULTRA_LOW: "ultra-low",
});

// Settings per quality tier
window.QUALITY_TIER_SETTINGS = Object.freeze({
  [window.QUALITY_TIERS.HIGH]: {
    particleCount: 15,
    wormSpawnRate: 1.0,
    shadowsEnabled: true,
    blurEffects: true,
    animationComplexity: "full",
    symbolRainDensity: 1.0,
    glowIntensity: 1.0,
    maxActiveWorms: 10,
    explosionParticles: 12,
  },
  [window.QUALITY_TIERS.MEDIUM]: {
    particleCount: 10,
    wormSpawnRate: 0.8,
    shadowsEnabled: true,
    blurEffects: false,
    animationComplexity: "standard",
    symbolRainDensity: 0.8,
    glowIntensity: 0.7,
    maxActiveWorms: 8,
    explosionParticles: 8,
  },
  [window.QUALITY_TIERS.LOW]: {
    particleCount: 5,
    wormSpawnRate: 0.6,
    shadowsEnabled: false,
    blurEffects: false,
    animationComplexity: "simplified",
    symbolRainDensity: 0.6,
    glowIntensity: 0.4,
    maxActiveWorms: 5,
    explosionParticles: 4,
  },
  [window.QUALITY_TIERS.ULTRA_LOW]: {
    particleCount: 2,
    wormSpawnRate: 0.4,
    shadowsEnabled: false,
    blurEffects: false,
    animationComplexity: "minimal",
    symbolRainDensity: 0.4,
    glowIntensity: 0.2,
    maxActiveWorms: 3,
    explosionParticles: 0,
  },
});

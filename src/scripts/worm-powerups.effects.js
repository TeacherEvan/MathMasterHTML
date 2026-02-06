// src/scripts/worm-powerups.effects.js
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for effect helpers");
    return;
  }

  const effects = window.WormPowerUpEffects;
  if (!effects) {
    console.warn("✨ WormPowerUpEffects not available");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;
  if (effects.applyChainEffects) {
    effects.applyChainEffects(proto);
  }
  if (effects.applySpiderEffects) {
    effects.applySpiderEffects(proto);
  }
  if (effects.applyDevilEffects) {
    effects.applyDevilEffects(proto);
  }
})();

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

  if (!window.WormPowerUpEffectsRegistry) {
    window.WormPowerUpEffectsRegistry = {};
  }

  if (!window.__powerUpEffectsListenerBound) {
    window.__powerUpEffectsListenerBound = true;

    document.addEventListener("powerUpActivated", (event) => {
      const detail = event.detail || {};
      const system = detail.system;
      if (!system) return;

      const registry = window.WormPowerUpEffectsRegistry;
      const handler = registry[detail.type];
      if (!handler) {
        console.warn("❌ Unknown power-up type", detail.type);
        return;
      }

      handler(system, detail);
    });
  }
})();

// js/worm-behavior.js - Worm behavior logic module
console.log("🧠 Worm Behavior Loading...");

const WormBehaviorModules = window.WormBehaviorModules || {};

class WormBehavior {
  constructor(system) {
    this.system = system;
    this.logger = system.logger || console;
  }

  assignTarget(worm) {
    const assignTarget = WormBehaviorModules.assignTarget;
    return assignTarget ? assignTarget(this, worm) : false;
  }

  stealSymbol(worm) {
    const stealSymbol = WormBehaviorModules.stealSymbol;
    if (stealSymbol) {
      return stealSymbol(this, worm);
    }
  }

  updateWormRushingToTarget(worm) {
    const updateWormRushingToTarget =
      WormBehaviorModules.updateWormRushingToTarget;
    return updateWormRushingToTarget
      ? updateWormRushingToTarget(this, worm)
      : false;
  }

  _resolveTargetElement(worm, symbolsSource) {
    const resolveTargetElement = WormBehaviorModules.resolveTargetElement;
    return resolveTargetElement
      ? resolveTargetElement(this, worm, symbolsSource)
      : null;
  }

  _getAvailableSymbolsForWorm(worm, symbolsSource) {
    const getAvailableSymbolsForWorm =
      WormBehaviorModules.getAvailableSymbolsForWorm;
    return getAvailableSymbolsForWorm
      ? getAvailableSymbolsForWorm(this, worm, symbolsSource)
      : [];
  }
}

if (typeof window !== "undefined") {
  window.WormBehavior = WormBehavior;
}

/**
 * EvanPulse — Target selection highlight for Evan helper
 * Registers as window.EvanPulse
 * Called by EvanPresenter.moveHandTo(x, y, bounds, target) and EvanPresenter.parkHand()/hide()
 * Honors prefers-reduced-motion: static outline only, no animation.
 */
(function () {
  "use strict";

  let lastTarget = null;

  function setTarget(target) {
    if (lastTarget === target) {
      return;
    }
    if (lastTarget && lastTarget instanceof Element) {
      lastTarget.classList.remove("evan-pulse-target");
    }
    lastTarget = target;
    if (target && target instanceof Element) {
      target.classList.add("evan-pulse-target");
    }
  }

  function clearTarget() {
    if (lastTarget && lastTarget instanceof Element) {
      lastTarget.classList.remove("evan-pulse-target");
    }
    lastTarget = null;
  }

  window.EvanPulse = {
    setTarget,
    clearTarget,
  };
})();
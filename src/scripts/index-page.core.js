// src/scripts/index-page.core.js
(function() {
  "use strict";

  const modules = window.IndexPageModules || {};
  const state = {
    resizeTimer: null,
    isDestroyed: false,
  };

  function handleDOMContentLoaded() {
    modules.matrix?.createMatrixRain?.();
    modules.effects?.startDynamicEffects?.();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      modules.effects?.stopDynamicEffects?.();
    } else {
      modules.effects?.startDynamicEffects?.();
    }
  }

  function handleResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      modules.matrix?.createMatrixRain?.();
    }, 200);
  }

  function handleKeydown(event) {
    if (event.repeat || state.isDestroyed) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      modules.ripple?.createCenteredRipple?.();
    }
  }

  function handleClick(event) {
    modules.ripple?.createRippleFromEvent?.(event);
  }

  function init() {
    if (!document.body) {
      console.error("[IndexPage] document.body not available");
      return;
    }

    document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeydown);
    document.body.addEventListener("click", handleClick, { passive: true });
  }

  function destroy() {
    state.isDestroyed = true;
    clearTimeout(state.resizeTimer);

    document.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("keydown", handleKeydown);
    if (document.body) {
      document.body.removeEventListener("click", handleClick);
    }
  }

  window.IndexPage = {
    init,
    destroy,
  };
})();

// src/scripts/index-page.core.js
(function () {
  "use strict";

  const modules = window.IndexPageModules || {};
  const PRIMARY_CTA_SELECTOR = "#begin-training-button";
  const state = {
    resizeTimer: null,
    isDestroyed: false,
  };

  function isPrimaryCtaElement(element) {
    return element instanceof Element
      ? Boolean(element.closest(PRIMARY_CTA_SELECTOR))
      : false;
  }

  function handleDOMContentLoaded() {
    modules.matrix?.createMatrixRain?.();
    modules.effects?.startDynamicEffects?.();
    modules.scoreboard?.init?.();
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

    if (
      (event.key === "Enter" || event.key === " ") &&
      isPrimaryCtaElement(document.activeElement)
    ) {
      event.preventDefault();
      modules.effects?.activatePrimaryCta?.("keyboard");
      modules.ripple?.createCenteredRipple?.();
      return;
    }

    if (modules.scoreboard?.handleKeydown?.(event)) {
      return;
    }
  }

  function handleClick(event) {
    if (isPrimaryCtaElement(event.target)) {
      modules.effects?.activatePrimaryCta?.("pointer");
      modules.ripple?.createRippleFromEvent?.(event);
      return;
    }

    if (modules.scoreboard?.handlePageClick?.(event)) {
      return;
    }
  }

  function init() {
    if (!document.body) {
      console.error("[IndexPage] document.body not available");
      return;
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", handleDOMContentLoaded, {
        once: true,
      });
    } else {
      handleDOMContentLoaded();
    }
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

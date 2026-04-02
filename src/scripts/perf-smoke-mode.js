// src/scripts/perf-smoke-mode.js - benchmark-only visual load shedding
(function enablePerfSmokeMode() {
  if (typeof window === "undefined" || window.__PERF_SMOKE_MODE !== true) {
    return;
  }

  document.documentElement.setAttribute("data-perf-smoke", "true");
})();

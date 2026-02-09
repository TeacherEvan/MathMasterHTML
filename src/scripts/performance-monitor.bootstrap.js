document.addEventListener("DOMContentLoaded", () => {
  if (!window.PerformanceMonitor) {
    return;
  }

  window.performanceMonitor = new window.PerformanceMonitor();
  window.performanceMonitor.init();

  document.addEventListener("keydown", (event) => {
    if (event.key === "p" || event.key === "P") {
      window.performanceMonitor.toggle();
    }
  });
});

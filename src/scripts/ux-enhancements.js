/**
 * UX Enhancements Module - Production-Grade UI Utilities
 * Provides toast notifications, loading states, ripple effects, and more
 */

(function() {
  const modules = window.UXModules;
  if (!modules) {
    console.error("❌ UX modules not loaded");
    return;
  }

  const toastManager = new modules.ToastNotificationManager();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      modules.RippleEffectManager.initializeRippleEffects();
      modules.LazyLoadManager.initializeLazyImages();
    });
  } else {
    modules.RippleEffectManager.initializeRippleEffects();
    modules.LazyLoadManager.initializeLazyImages();
  }

  window.UXEnhancements = {
    toast: toastManager,
    ripple: modules.RippleEffectManager,
    loading: modules.LoadingStateManager,
    ProgressBar: modules.ProgressBarManager,
    lazyLoad: modules.LazyLoadManager,
    accessibility: modules.AccessibilityManager,
  };

  console.log("✨ UX Enhancements Module loaded successfully");
})();

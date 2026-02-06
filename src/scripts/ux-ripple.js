(function() {
  class RippleEffectManager {
    static addRipple(element, event) {
      if (!element.classList.contains("ripple-container")) {
        element.classList.add("ripple-container");
      }

      const ripple = document.createElement("span");
      ripple.className = "ripple-effect";

      const rect = element.getBoundingClientRect();
      const clientX =
        event.clientX || (event.touches && event.touches[0].clientX);
      const clientY =
        event.clientY || (event.touches && event.touches[0].clientY);

      const size = Math.max(rect.width, rect.height);
      const x = clientX - rect.left - size / 2;
      const y = clientY - rect.top - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      element.appendChild(ripple);

      ripple.addEventListener("animationend", () => {
        ripple.remove();
      });
    }

    static initializeRippleEffects() {
      document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-ripple]");
        if (target) {
          RippleEffectManager.addRipple(target, event);
        }
      });
    }
  }

  window.UXModules = window.UXModules || {};
  window.UXModules.RippleEffectManager = RippleEffectManager;
})();

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
        typeof event?.clientX === "number"
          ? event.clientX
          : event?.touches?.[0]?.clientX;
      const clientY =
        typeof event?.clientY === "number"
          ? event.clientY
          : event?.touches?.[0]?.clientY;
      const hasPointerCoordinates =
        typeof clientX === "number" &&
        typeof clientY === "number" &&
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;

      const size = Math.max(rect.width, rect.height);
      const x = hasPointerCoordinates
        ? clientX - rect.left - size / 2
        : rect.width / 2 - size / 2;
      const y = hasPointerCoordinates
        ? clientY - rect.top - size / 2
        : rect.height / 2 - size / 2;

      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      element.appendChild(ripple);

      ripple.addEventListener("animationend", () => {
        ripple.remove();
      });
    }

    static initializeRippleEffects() {
      if (window.PointerEvent) {
        document.addEventListener("pointerdown", (event) => {
          const target = event.target.closest("[data-ripple]");
          if (target) {
            RippleEffectManager.addRipple(target, event);
          }
        });
      }

      document.addEventListener("click", (event) => {
        if (window.PointerEvent && event.detail !== 0) {
          return;
        }

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

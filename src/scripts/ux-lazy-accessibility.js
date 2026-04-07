(function() {
  class LazyLoadManager {
    static initializeLazyImages() {
      const images = document.querySelectorAll("img[data-src]");

      if ("IntersectionObserver" in window) {
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              if (img.hasAttribute("data-src")) {
                img.removeAttribute("data-src");
              }
              imageObserver.unobserve(img);
            }
          });
        });

        images.forEach((img) => imageObserver.observe(img));
      } else {
        images.forEach((img) => {
          img.src = img.dataset.src;
          if (img.hasAttribute("data-src")) {
            img.removeAttribute("data-src");
          }
        });
      }
    }

    static preloadResources(urls, type = "image") {
      const typeMap = {
        image: "image",
        script: "script",
        style: "style",
      };

      urls.forEach((url) => {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = typeMap[type];
        link.href = url;
        document.head.appendChild(link);
      });
    }

    static loadScriptAsync(url) {
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }

  class AccessibilityManager {
    static announce(message, priority = "polite") {
      const announcement = document.createElement("div");
      announcement.className = "sr-only";
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", priority);
      announcement.textContent = message;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    static addSkipLink(targetId = "main-content") {
      const skipLink = document.createElement("a");
      skipLink.href = `#${targetId}`;
      skipLink.className = "skip-link";
      skipLink.textContent = "Skip to main content";
      document.body.insertBefore(skipLink, document.body.firstChild);
    }

    static trapFocus(element, options = {}) {
      if (!element) {
        return () => {};
      }

      const previousFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const focusableElements = Array.from(
        element.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }

        return !node.hidden && !node.hasAttribute("disabled");
      });
      const firstFocusable = focusableElements[0] || null;
      const lastFocusable =
        focusableElements[focusableElements.length - 1] || null;
      const onKeydown = (event) => {
        if (event.key !== "Tab" || !firstFocusable || !lastFocusable) {
          return;
        }

        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            lastFocusable.focus({ preventScroll: true });
            event.preventDefault();
          }
          return;
        }

        if (document.activeElement === lastFocusable) {
          firstFocusable.focus({ preventScroll: true });
          event.preventDefault();
        }
      };

      element.addEventListener("keydown", onKeydown);

      const preferredTarget =
        typeof options.initialFocus === "function"
          ? options.initialFocus()
          : options.initialFocus || firstFocusable || element;
      if (preferredTarget instanceof HTMLElement) {
        preferredTarget.focus({ preventScroll: true });
      }

      return () => {
        element.removeEventListener("keydown", onKeydown);

        if (options.restoreFocus === false) {
          return;
        }

        if (previousFocus && previousFocus.isConnected) {
          previousFocus.focus({ preventScroll: true });
        }
      };
    }
  }

  window.UXModules = window.UXModules || {};
  window.UXModules.LazyLoadManager = LazyLoadManager;
  window.UXModules.AccessibilityManager = AccessibilityManager;
})();

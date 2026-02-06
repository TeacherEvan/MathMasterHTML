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

    static trapFocus(element) {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      element.addEventListener("keydown", (e) => {
        if (e.key === "Tab") {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              lastFocusable.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              firstFocusable.focus();
              e.preventDefault();
            }
          }
        }
      });

      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }

  window.UXModules = window.UXModules || {};
  window.UXModules.LazyLoadManager = LazyLoadManager;
  window.UXModules.AccessibilityManager = AccessibilityManager;
})();

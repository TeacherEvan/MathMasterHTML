// js/lock-manager.loader.js - Lock component loading helpers
console.log("🔒 LockManager loader helpers loading...");

(function attachLockManagerLoader() {
  if (!window.LockManager) {
    console.error("❌ LockManager core not loaded");
    return;
  }

  const proto = window.LockManager.prototype;

  proto.loadLockComponent = function loadLockComponent(componentName) {
    return new Promise((resolve, reject) => {
      if (!this.container) {
        reject(new Error("Lock container not found"));
        return;
      }

      const lockPath = `/src/assets/components/lock-components/${componentName}`;
      console.log(`🔒 Loading lock component: ${lockPath}`);

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error(`Component loading timeout: ${componentName}`));
      }, 10000);

      fetch(lockPath)
        .then((response) => {
          clearTimeout(timeout);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch ${lockPath}: ${response.statusText}`,
            );
          }
          return response.text();
        })
        .then((html) => {
          // Parse the HTML and extract content
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, "text/html");

          // Extract styles from head
          const styleElements = doc.head.querySelectorAll("style");
          let styles = "";
          styleElements.forEach((style) => {
            styles += style.outerHTML;
          });

          // Extract body content
          const bodyContent = doc.body.innerHTML;

          // Wrap content in lock-component-wrapper
          const wrappedContent = `
                        ${styles}
                        <div class="lock-component-wrapper">
                            ${bodyContent}
                        </div>
                    `;

          // Insert into container
          this.container.innerHTML = wrappedContent;

          resolve();
        })
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  };

  // Normalize component naming to handle case variations
  proto.normalizeComponentName = function normalizeComponentName(level) {
    if (level === 1) return "Line-1-transformer.html";
    if (level === 5) return "Line-5-transformer.html";
    return `line-${level}-transformer.html`;
  };
})();

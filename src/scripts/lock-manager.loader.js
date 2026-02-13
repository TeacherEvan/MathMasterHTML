// js/lock-manager.loader.js - Lock component loading helpers
console.log("🔒 LockManager loader helpers loading...");

(function attachLockManagerLoader() {
  if (!window.LockManager) {
    console.error("❌ LockManager core not loaded");
    return;
  }

  const ALLOWED_LOCK_COMPONENTS = new Set([
    "Line-1-transformer.html",
    "line-2-transformer.html",
    "line-3-transformer.html",
    "line-4-transformer.html",
    "Line-5-transformer.html",
    "line-6-transformer.html",
  ]);

  function isUnsafeStyleContent(styleText) {
    if (!styleText) return false;
    return (
      /@import\s+/i.test(styleText) ||
      /url\(\s*['"]?\s*https?:/i.test(styleText)
    );
  }

  function sanitizeComponentDocument(doc) {
    doc.querySelectorAll("script").forEach((scriptNode) => scriptNode.remove());

    doc.querySelectorAll("style").forEach((styleNode) => {
      if (isUnsafeStyleContent(styleNode.textContent)) {
        styleNode.remove();
      }
    });

    doc.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase();
        const attrValue = String(attr.value || "")
          .trim()
          .toLowerCase();

        if (attrName.startsWith("on")) {
          node.removeAttribute(attr.name);
          return;
        }

        if (attrName === "href" || attrName === "src") {
          if (
            attrValue.startsWith("javascript:") ||
            attrValue.startsWith("data:text/html")
          ) {
            node.removeAttribute(attr.name);
          }
        }
      });
    });
  }

  const proto = window.LockManager.prototype;

  proto.loadLockComponent = function loadLockComponent(componentName) {
    return new Promise((resolve, reject) => {
      if (!this.container) {
        reject(new Error("Lock container not found"));
        return;
      }

      if (!ALLOWED_LOCK_COMPONENTS.has(componentName)) {
        reject(new Error(`Lock component not allowed: ${componentName}`));
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
          sanitizeComponentDocument(doc);

          // Extract styles from head
          const styleElements = doc.head.querySelectorAll("style");
          let styles = "";
          styleElements.forEach((style) => {
            styles += style.outerHTML;
          });

          // Load linked stylesheets (dedupe by href)
          const linkElements = doc.head.querySelectorAll(
            'link[rel="stylesheet"]',
          );
          linkElements.forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;
            let hrefUrl;
            try {
              hrefUrl = new URL(href, window.location.origin);
            } catch {
              return;
            }
            if (hrefUrl.origin !== window.location.origin) {
              return;
            }
            const existing = document.head.querySelector(
              `link[rel="stylesheet"][href="${href}"]`,
            );
            if (!existing) {
              const newLink = document.createElement("link");
              newLink.rel = "stylesheet";
              newLink.href = hrefUrl.toString();
              document.head.appendChild(newLink);
            }
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

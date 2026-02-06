(function() {
  class LoadingStateManager {
    static showLoadingSkeleton(element, skeletonType = "custom") {
      const originalContent = element.innerHTML;
      element.dataset.originalContent = originalContent;

      const skeleton = document.createElement("div");
      skeleton.className = `loading-skeleton ${skeletonType}-loading-skeleton`;
      skeleton.setAttribute("aria-label", "Loading...");
      skeleton.setAttribute("role", "status");

      element.innerHTML = "";
      element.appendChild(skeleton);
    }

    static hideLoadingSkeleton(element) {
      const originalContent = element.dataset.originalContent;
      if (originalContent !== undefined) {
        element.innerHTML = originalContent;
        delete element.dataset.originalContent;
      }
    }

    static showLoadingSpinner(element, message = "Loading...") {
      const spinner = document.createElement("div");
      spinner.className = "loading-spinner-container";
      spinner.innerHTML = `
            <div class="loading-spinner"></div>
            ${message ? `<p class="loading-message">${message}</p>` : ""}
        `;
      spinner.setAttribute("role", "status");
      spinner.setAttribute("aria-label", message);

      element.dataset.originalContent = element.innerHTML;
      element.innerHTML = "";
      element.appendChild(spinner);
    }

    static hideLoadingSpinner(element) {
      this.hideLoadingSkeleton(element);
    }
  }

  class ProgressBarManager {
    constructor(container) {
      this.container = container;
      this.progressBar = this.createProgressBar();
      this.currentProgress = 0;
    }

    createProgressBar() {
      const bar = document.createElement("div");
      bar.className = "progress-bar";
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");

      const fill = document.createElement("div");
      fill.className = "progress-bar-fill progress-bar-animated";
      bar.appendChild(fill);

      this.container.appendChild(bar);
      return bar;
    }

    setProgress(progress) {
      this.currentProgress = Math.max(0, Math.min(100, progress));
      const fill = this.progressBar.querySelector(".progress-bar-fill");
      fill.style.width = `${this.currentProgress}%`;

      this.progressBar.setAttribute("aria-valuenow", this.currentProgress);
      this.progressBar.setAttribute(
        "aria-label",
        `Progress: ${this.currentProgress}%`,
      );
    }

    reset() {
      this.setProgress(0);
    }

    complete() {
      this.setProgress(100);
    }

    destroy() {
      if (this.progressBar && this.progressBar.parentNode) {
        this.progressBar.parentNode.removeChild(this.progressBar);
      }
    }
  }

  window.UXModules = window.UXModules || {};
  window.UXModules.LoadingStateManager = LoadingStateManager;
  window.UXModules.ProgressBarManager = ProgressBarManager;
})();

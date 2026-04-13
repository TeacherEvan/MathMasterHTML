(function() {
  class LoadingStateManager {
    static storeOriginalContent(element) {
      if (!element || element.dataset.originalContent !== undefined) {
        return false;
      }

      element.dataset.originalContent = element.innerHTML;
      return true;
    }

    static showLoadingSkeleton(element, skeletonType = "custom") {
      if (!this.storeOriginalContent(element)) {
        return;
      }

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
      if (!this.storeOriginalContent(element)) {
        return;
      }

      const spinner = document.createElement("div");
      spinner.className = "loading-spinner-container";
      spinner.innerHTML = `
            <div class="loading-spinner"></div>
            ${message ? `<p class="loading-message">${message}</p>` : ""}
        `;
      spinner.setAttribute("role", "status");
      spinner.setAttribute("aria-label", message);

      element.innerHTML = "";
      element.appendChild(spinner);
    }

    static hideLoadingSpinner(element) {
      this.hideLoadingSkeleton(element);
    }

    static showProblemLoadingState(
      element,
      { level = "problem", problemPath = null, title = null, detail = null } = {},
    ) {
      if (!this.storeOriginalContent(element)) {
        return;
      }

      const resolvedLevel =
        typeof level === "string" && level.trim().length > 0
          ? level.trim()
          : "problem";
      const resolvedTitle =
        typeof title === "string" && title.trim().length > 0
          ? title.trim()
          : "Loading " + resolvedLevel + " problem set...";
      const resolvedDetail =
        typeof detail === "string" && detail.trim().length > 0
          ? detail.trim()
          : problemPath
            ? "Fetching " + problemPath.split("/").pop()
            : "Preparing step targets...";

      element.innerHTML = "";

      const container = document.createElement("div");
      container.className =
        "loading-spinner-container loading-spinner-container--problem";
      container.setAttribute("role", "status");
      container.setAttribute("aria-live", "polite");
      container.setAttribute("aria-label", resolvedTitle);

      const spinner = document.createElement("div");
      spinner.className = "loading-spinner";

      const titleEl = document.createElement("p");
      titleEl.className = "loading-message";
      titleEl.textContent = resolvedTitle;

      const detailEl = document.createElement("p");
      detailEl.className = "loading-message-detail";
      detailEl.textContent = resolvedDetail;

      container.appendChild(spinner);
      container.appendChild(titleEl);
      container.appendChild(detailEl);
      element.appendChild(container);
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
  window.showProblemLoadingSkeleton = function showProblemLoadingSkeleton(
    element,
    context = {},
  ) {
    return LoadingStateManager.showProblemLoadingState(element, context);
  };
  window.hideProblemLoadingSkeleton = function hideProblemLoadingSkeleton(
    element,
  ) {
    return LoadingStateManager.hideLoadingSkeleton(element);
  };
})();

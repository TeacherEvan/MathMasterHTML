(function() {
  class ToastNotificationManager {
    constructor() {
      this.toastContainer = this.createToastContainer();
      this.activeToasts = new Set();
    }

    createToastContainer() {
      let container = document.querySelector(".toast-container");
      if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        container.setAttribute("role", "region");
        container.setAttribute("aria-label", "Notifications");
        document.body.appendChild(container);
      }
      return container;
    }

    show(message, type = "info", duration = 3000) {
      const toast = this.createToast(message, type);
      this.activeToasts.add(toast);
      this.toastContainer.appendChild(toast);
      this.announceToScreenReader(message);

      if (duration > 0) {
        setTimeout(() => this.dismiss(toast), duration);
      }

      return toast;
    }

    createToast(message, type) {
      const toast = document.createElement("div");
      toast.className = `toast toast-${type}`;
      toast.setAttribute("role", "alert");
      toast.setAttribute("aria-live", "polite");

      const icon = this.getIconForType(type);
      toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

      toast.addEventListener("click", () => this.dismiss(toast));

      return toast;
    }

    dismiss(toast) {
      if (!this.activeToasts.has(toast)) return;

      toast.classList.add("toast-hide");
      this.activeToasts.delete(toast);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 400);
    }

    getIconForType(type) {
      const icons = {
        success: "✓",
        error: "✗",
        warning: "⚠",
        info: "ℹ",
      };
      return icons[type] || icons.info;
    }

    announceToScreenReader(message) {
      const announcement = document.createElement("div");
      announcement.className = "sr-only";
      announcement.setAttribute("role", "status");
      announcement.setAttribute("aria-live", "polite");
      announcement.textContent = message;
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    success(message, duration) {
      return this.show(message, "success", duration);
    }

    error(message, duration) {
      return this.show(message, "error", duration);
    }

    warning(message, duration) {
      return this.show(message, "warning", duration);
    }

    info(message, duration) {
      return this.show(message, "info", duration);
    }

    dismissAll() {
      this.activeToasts.forEach((toast) => this.dismiss(toast));
    }
  }

  window.UXModules = window.UXModules || {};
  window.UXModules.ToastNotificationManager = ToastNotificationManager;
})();

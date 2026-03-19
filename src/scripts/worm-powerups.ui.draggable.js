// src/scripts/worm-powerups.ui.draggable.js - Draggable Behavior for Power-Up UI
// Extracted from worm-powerups.ui.js to isolate drag interaction logic
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for draggable helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;

  /**
   * Make element draggable with boundary validation
   * Supports pointer events for touch/mouse, validates against UIBoundaryManager
   * @param {HTMLElement} element - Element to make draggable
   */
  proto.makeDraggable = function(element) {
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    element.addEventListener("pointerdown", dragStart);
    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", dragEnd);

    function dragStart(e) {
      // Only allow dragging from the display itself, not from power-up items
      if (e.target.closest(".power-up-item")) {
        return;
      }

      if (e.target === element || e.target.parentElement === element) {
        const rect = element.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
        isDragging = true;
        element.dataset.dragged = "true";
        element.style.left = `${rect.left}px`;
        element.style.top = `${rect.top}px`;
        element.style.right = "auto";
        element.style.bottom = "auto";
        element.style.transform = "none";
        element.style.cursor = "grabbing";
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();

        const currentX = e.clientX - dragOffsetX;
        const currentY = e.clientY - dragOffsetY;

        // Keep within viewport bounds
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        let boundedX = Math.max(0, Math.min(currentX, maxX));
        let boundedY = Math.max(0, Math.min(currentY, maxY));

        // Validate position through UIBoundaryManager if available
        if (window.uiBoundaryManager) {
          const validation = window.uiBoundaryManager.validatePosition(
            "power-up-display",
            { x: boundedX, y: boundedY },
          );
          if (!validation.valid) {
            boundedX = validation.adjustedPosition.x;
            boundedY = validation.adjustedPosition.y;
            console.log(
              "📐 Position adjusted by boundary manager:",
              validation.violations,
            );
          }
        }

        setPosition(boundedX, boundedY, element);
      }
    }

    function dragEnd() {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = "move";
      }
    }

    function setPosition(xPos, yPos, el) {
      el.style.left = `${xPos}px`;
      el.style.top = `${yPos}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.transform = "none";
    }
  };

  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  proto.capitalize = function(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
})();

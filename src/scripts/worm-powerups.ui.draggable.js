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
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    element.addEventListener("pointerdown", dragStart);
    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", dragEnd);

    function dragStart(e) {
      // Only allow dragging from the display itself, not from power-up items
      if (e.target.classList.contains("power-up-item")) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === element || e.target.parentElement === element) {
        isDragging = true;
        element.style.cursor = "grabbing";
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

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

        setTranslate(boundedX, boundedY, element);
      }
    }

    function dragEnd(e) {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        element.style.cursor = "move";
      }
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
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

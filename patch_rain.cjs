const fs = require('fs');

const path = 'src/scripts/symbol-rain.interactions.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `      const resolvePointerSymbolElement = (event) => {
        const directTarget = event.target.closest(
          ".falling-symbol[data-symbol-state='visible']",
        );

        const isTouchLikeInteraction =
          event.pointerType === "touch" ||
          window.matchMedia?.("(pointer: coarse)")?.matches === true;

        if (!isTouchLikeInteraction) {
          return directTarget;
        }

        const hasPointerCoordinates =
          typeof event.clientX === "number" && typeof event.clientY === "number";

        if (!hasPointerCoordinates) {
          return directTarget;
        }

        const candidates = SymbolRainTargets.getVisibleCandidates({
          symbolRainContainer,
          state,
        });

        let bestCandidate = null;
        let bestDistanceSquared = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
          const { rect } = candidate;
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distanceX = centerX - event.clientX;
          const distanceY = centerY - event.clientY;
          const distanceSquared = distanceX * distanceX + distanceY * distanceY;
          const touchRadius = Math.max(
            26,
            Math.min(rect.width, rect.height) * 0.52,
          );`,
  `      const resolvePointerSymbolElement = (event) => {
        const directTarget = event.target.closest(
          ".falling-symbol[data-symbol-state='visible']",
        );

        const isTouchLikeInteraction =
          event.pointerType === "touch" ||
          event.changedTouches?.length > 0 ||
          window.displayManager?.getViewportState()?.hasCoarsePointer === true;

        if (!isTouchLikeInteraction) {
          return directTarget;
        }

        let clientX = event.clientX;
        let clientY = event.clientY;

        if (event.changedTouches && event.changedTouches.length > 0) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
        }

        const hasPointerCoordinates =
          typeof clientX === "number" && typeof clientY === "number";

        if (!hasPointerCoordinates) {
          return directTarget;
        }

        const candidates = SymbolRainTargets.getVisibleCandidates({
          symbolRainContainer,
          state,
        });

        let bestCandidate = null;
        let bestDistanceSquared = Number.POSITIVE_INFINITY;
        const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);

        for (const candidate of candidates) {
          const { rect } = candidate;
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distanceX = centerX - clientX;
          const distanceY = centerY - clientY;
          const distanceSquared = distanceX * distanceX + distanceY * distanceY;
          const touchRadius = Math.max(
            26 * devicePixelRatio,
            Math.min(rect.width, rect.height) * 0.52,
          );`
);

content = content.replace(
  `      if (!window.PointerEvent) {
        handleFallbackClick = (event) => {
          const fallingSymbolElement = event.target.closest(
            ".falling-symbol[data-symbol-state='visible']",
          );
          if (
            fallingSymbolElement &&
            symbolRainContainer.contains(fallingSymbolElement)
          ) {
            handleSymbolCollection(fallingSymbolElement);
          }
        };

        symbolRainContainer.addEventListener("click", handleFallbackClick);
      }`,
  `      if (!window.PointerEvent) {
        handleFallbackClick = (event) => {
          const fallingSymbolElement = resolvePointerSymbolElement(event);
          if (
            fallingSymbolElement &&
            symbolRainContainer.contains(fallingSymbolElement)
          ) {
            handleSymbolCollection(fallingSymbolElement);
          }
        };

        symbolRainContainer.addEventListener("touchstart", handleFallbackClick, pointerListenerOptions);
        symbolRainContainer.addEventListener("click", handleFallbackClick);
      }`
);

fs.writeFileSync(path, content, 'utf8');

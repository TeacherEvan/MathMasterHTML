const fs = require('fs');

const path = 'src/scripts/display-manager.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `      const coarsePointerQuery = window.matchMedia?.(
        "(hover: none) and (pointer: coarse)",
      );
      const hasCoarsePointer = Boolean(coarsePointerQuery?.matches);
      const {`,
  `      const coarsePointerQuery = window.matchMedia?.(
        "(hover: none) and (pointer: coarse)",
      );
      const platformHints = this.getMobilePlatformHints();
      const hasCoarsePointer =
        Boolean(coarsePointerQuery?.matches) ||
        platformHints.isAndroidPhoneLikeRuntime ||
        platformHints.isTabletLikeAndroidRuntime;
      const {`
);

content = content.replace(
  `      } = this.compactViewportConfig;
      const platformHints = this.getMobilePlatformHints();
      const isLandscape = width >= height;`,
  `      } = this.compactViewportConfig;
      const isLandscape = width >= height;`
);

content = content.replace(
  `      const isCompactAndroidWebViewFallback =
        platformHints.isAndroidPhoneLikeRuntime &&
        !hasCoarsePointer &&
        isLandscape &&
        width <= compactMaxWidth &&
        height <= compactLandscapeWidth;`,
  `      const isCompactAndroidWebViewFallback =
        platformHints.isAndroidPhoneLikeRuntime &&
        isLandscape &&
        width <= compactMaxWidth &&
        height <= compactLandscapeWidth;`
);

fs.writeFileSync(path, content, 'utf8');

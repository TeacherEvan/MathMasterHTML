// src/tools/scripts/verify/verify.constants.js

export const CRITICAL_FILES = [
  "package.json",
  "eslint.config.js",
  "game.html",
  "index.html",
  "level-select.html",
  "src/scripts/worm.js",
  "src/scripts/game.js",
  "src/scripts/constants.js",
  "src/scripts/utils.js",
  "src/styles/css/worm-base.css",
  "src/styles/css/game.css",
  "Docs/SystemDocs/_INDEX.md",
  ".github/copilot-instructions.md",
];

export const REQUIRED_DOCS = [
  "SystemDocs/ARCHITECTURE.md",
  "SystemDocs/DEVELOPMENT_GUIDE.md",
  "Worms/WORM_DEVELOPER_GUIDE.md",
];

export const JS_DIRECTORIES = [
  "src/scripts",
  "lock",
  "src/tools/middle-screen",
];
export const CSS_DIRECTORIES = ["src/styles/css", "lock"];

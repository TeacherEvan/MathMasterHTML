import js from "@eslint/js";
import globals from "globals";

export default [
  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      "*.backup",
      "*.corrupted",
      "**/*.min.js",
      "src/scripts/worm-behavior.js",
      "src/scripts/worm-constants.js",
      "src/scripts/worm-renderer.js",
    ],
  },

  // JavaScript files configuration
  {
    files: [
      "src/scripts/**/*.js",
      "lock/**/*.js",
      "src/tools/middle-screen/**/*.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script", // Browser scripts, not ES modules
      globals: {
        ...globals.browser,

        // CommonJS (for optional module.exports at file end)
        module: "readonly",

        // Project-specific globals (classes exposed on window)
        // These are defined in their respective files and used across others
        WormSystem: "writable",
        wormSystem: "writable",
        WormSpawnManager: "writable",
        WormSpawnCoordinator: "writable",
        WormMovement: "writable",
        WormPowerUpSystem: "writable",
        WormFactory: "writable",
        WormCursorTracker: "writable",
        WormAggressionModel: "writable",
        WormPathfinder: "writable",
        WormObstacleMap: "writable",
        WormEvasion: "writable",
        Logger: "writable",
        ResourceManager: "writable",
        ProblemLoader: "writable",
        SymbolValidator: "writable",
        PerformanceMonitor: "writable",
        performanceMonitor: "writable",
        GameConstants: "writable",
        DisplayManager: "writable",
        LockManager: "writable",
        lockManager: "writable",
        ConsoleManager: "writable",

        // Utility functions from utils.js
        normalizeSymbol: "writable",
        calculateDistance: "writable",
        createDOMElement: "writable",
        generateUniqueId: "writable",
        getLevelFromURL: "writable",
        deferExecution: "writable",

        // Functions exposed globally
        getActiveSymbolCount: "writable",
        symbolRainActiveCount: "writable",
        initSymbolRain: "writable",
      },
    },
    rules: {
      // ESLint recommended rules as base
      ...js.configs.recommended.rules,

      // Disable no-redeclare since we use window.X = X pattern
      "no-redeclare": "off",

      // Relax some rules for browser game code
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_|^e$|^event$",
          varsIgnorePattern: "^_",
        },
      ],
      "no-console": "off", // Console logs are used for debugging with emoji prefixes

      // Performance-related rules
      "no-loop-func": "warn", // Avoid creating functions in loops
      "no-constant-condition": "warn",

      // Code quality
      eqeqeq: ["warn", "smart"], // Prefer === except for null checks
      "no-var": "warn", // Prefer let/const
      "prefer-const": "warn",

      // Allow some patterns common in game code
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-prototype-builtins": "off",
    },
  },
];

// src/tools/scripts/line-limit.config.js
// Central policy config for the 200-line limit enforcement.

export const LINE_LIMIT_POLICY = {
  maxLines: 200,

  // File extensions we consider "source" for this policy.
  includeExtensions: [
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".css",
    ".html",
    ".json",
    ".yml",
    ".yaml",
    ".xml",
    ".svg",
    ".txt",
  ],

  // Excluded by filename (generated/third-party artifacts).
  excludeFileNames: ["package-lock.json", "test-results.json"],

  // Excluded by path segment (third-party / generated output).
  excludeDirNames: [
    "node_modules",
    ".git",
    "playwright-report",
    "test-results",
    ".snapshots",
    "archive",
    ".vscode",
  ],

  // Excluded patterns.
  excludeFileNameRegexes: [/\.min\.(js|css)$/i, /\.map$/i],

  // Excluded extensions.
  excludeExtensions: [".md"],

  // Baseline violations file (used for "no new violations" mode).
  baselineViolationsCsv: "Docs/LINE_LIMIT_200_AUDIT.policy.violations.csv",
};

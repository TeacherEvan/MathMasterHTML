// src/tools/scripts/line-limit.config.js
// Central policy config for the line length guidance.
// maxLines is a soft suggestion, not a hard limit. Aim for 250–300 lines.

export const LINE_LIMIT_POLICY = {
  maxLines: 300,

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
  excludeFileNames: [
    "package-lock.json",
    "test-results.json",
    "test-results.competition.json",
  ],

  // Excluded by path segment (third-party / generated output).
  excludeDirNames: [
    "node_modules",
    ".git",
    ".worktrees",
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
  baselineViolationsCsv:
    "Docs/SystemDocs/LINE_LIMIT_200_AUDIT.policy.violations.csv",
};

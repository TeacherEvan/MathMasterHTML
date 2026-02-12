#!/usr/bin/env node
// src/tools/scripts/line-limit-check.js
// Thin wrapper to keep a stable entrypoint for the line-limit checker.

export { runLineLimitCheck } from "./line-limit/index.js";

import { isExecutedDirectly, runCli } from "./line-limit/cli.js";

if (isExecutedDirectly(import.meta.url)) {
  runCli();
}

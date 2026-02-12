// src/tools/scripts/verify/checks/stats.js

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { CSS_DIRECTORIES, JS_DIRECTORIES } from "../verify.constants.js";
import { log, logSection } from "../verify.logging.js";

function countLinesInDir(rootDir, dir) {
  let total = 0;
  const fullPath = join(rootDir, dir);

  if (!existsSync(fullPath)) return 0;

  const files = readdirSync(fullPath);
  for (const file of files) {
    const filePath = join(fullPath, file);
    const stat = statSync(filePath);
    if (stat.isFile() && (file.endsWith(".js") || file.endsWith(".css"))) {
      const content = readFileSync(filePath, "utf8");
      total += content.split("\n").length;
    }
  }
  return total;
}

export function generateStats(rootDir) {
  logSection("PROJECT STATISTICS");

  let jsLines = 0;
  let cssLines = 0;

  for (const dir of JS_DIRECTORIES) {
    jsLines += countLinesInDir(rootDir, dir);
  }

  for (const dir of CSS_DIRECTORIES) {
    cssLines += countLinesInDir(rootDir, dir);
  }

  log(`📊 JavaScript: ~${jsLines.toLocaleString()} lines`, "cyan");
  log(`📊 CSS: ~${cssLines.toLocaleString()} lines`, "cyan");
  log(`📊 Total: ~${(jsLines + cssLines).toLocaleString()} lines`, "cyan");
}

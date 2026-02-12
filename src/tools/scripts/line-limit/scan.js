// src/tools/scripts/line-limit/scan.js

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { normalizeRelPath } from "./path-utils.js";

function readTextFileLines(fullPath) {
  const content = readFileSync(fullPath, "utf8");
  return content.split(/\r\n|\r|\n/).length;
}

function shouldExcludeFile({ name, ext, relPath, policy }) {
  const relNorm = normalizeRelPath(relPath);

  if (policy.excludeFileNames.includes(name)) return true;
  if (policy.excludeExtensions.includes(ext)) return true;
  if (policy.excludeFileNameRegexes.some((re) => re.test(name))) return true;

  for (const dirName of policy.excludeDirNames) {
    if (relNorm.includes(`/${dirName}/`) || relNorm.startsWith(`${dirName}/`)) {
      return true;
    }
  }

  return false;
}

function walkFiles(rootDir, policy) {
  /** @type {Array<{fullPath: string, relPath: string, name: string, ext: string}>} */
  const out = [];

  function walk(currentDir) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const relPath = normalizeRelPath(
        fullPath.substring(rootDir.length).replace(/^\\/, ""),
      );
      const name = entry.name;
      const dot = name.lastIndexOf(".");
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";

      if (!policy.includeExtensions.includes(ext)) continue;
      if (shouldExcludeFile({ name, ext, relPath, policy })) continue;

      // Quick skip for non-text files that happen to have these extensions.
      try {
        statSync(fullPath);
      } catch {
        continue;
      }

      out.push({ fullPath, relPath, name, ext });
    }
  }

  walk(rootDir);
  return out;
}

export function categorize(relPath) {
  const p = normalizeRelPath(relPath);
  if (p.startsWith("tests/")) return "tests";
  if (p.startsWith("src/pages/")) return "pages";
  if (p.startsWith("src/scripts/")) return "js-runtime";
  if (p.startsWith("src/styles/")) return "css";
  if (p.startsWith("src/assets/")) return "assets-source";
  if (p.startsWith("src/tools/")) return "tools";
  return "misc";
}

export function scanWorkspace({ rootDir, policy }) {
  const files = walkFiles(rootDir, policy);
  /** @type {Array<{relPath: string, ext: string, lines: number}>} */
  const scanned = [];
  /** @type {Array<{relPath: string, lines: number}>} */
  const violations = [];

  for (const f of files) {
    let lines = 0;
    try {
      lines = readTextFileLines(f.fullPath);
    } catch {
      continue;
    }

    const relPath = normalizeRelPath(f.relPath);
    scanned.push({ relPath, ext: f.ext, lines });

    if (lines > policy.maxLines) {
      violations.push({ relPath, lines });
    }
  }

  violations.sort(
    (a, b) => b.lines - a.lines || a.relPath.localeCompare(b.relPath),
  );

  return { scanned, violations };
}

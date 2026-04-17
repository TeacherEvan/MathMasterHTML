// src/tools/scripts/verify/checks/documentation.js

import { existsSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { REQUIRED_DOCS } from "../verify.constants.js";
import { log, logSection } from "../verify.logging.js";

const ALLOWED_MARKDOWN_FILES = new Set(REQUIRED_DOCS);
// Direct child agent definitions are allowed; nested markdown stays disallowed.
const CUSTOM_AGENT_FILE_RE = /^\.github\/agents\/[^/]+\.agent\.md$/;
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "playwright-report",
  "test-results",
]);

function isAllowedMarkdownFile(file) {
  return ALLOWED_MARKDOWN_FILES.has(file) || CUSTOM_AGENT_FILE_RE.test(file);
}

function collectMarkdownFiles(rootDir, relativeDir = "") {
  const currentDir = join(rootDir, relativeDir);
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const markdownFiles = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      markdownFiles.push(
        ...collectMarkdownFiles(rootDir, join(relativeDir, entry.name)),
      );
      continue;
    }

    if (entry.name.endsWith(".md")) {
      markdownFiles.push(join(relativeDir, entry.name).replaceAll("\\", "/"));
    }
  }

  return markdownFiles;
}

export function checkDocumentation(rootDir) {
  logSection("DOCUMENTATION CHECK");

  for (const doc of REQUIRED_DOCS) {
    const docPath = join(rootDir, doc);
    if (!existsSync(docPath)) {
      log(`❌ Missing required doc: ${doc}`, "red");
      return false;
    }
  }

  const markdownFiles = collectMarkdownFiles(rootDir).sort();
  const customAgentFiles = markdownFiles.filter(
    (file) => CUSTOM_AGENT_FILE_RE.test(file),
  );
  log(`📚 Markdown files detected: ${markdownFiles.length}`, "cyan");
  if (customAgentFiles.length > 0) {
    log(`🤖 Repo-local custom agents detected: ${customAgentFiles.length}`, "cyan");
  }

  const unexpectedFiles = markdownFiles.filter(
    (file) => !isAllowedMarkdownFile(file),
  );

  if (unexpectedFiles.length > 0) {
    log("❌ Unexpected markdown files found:", "red");
    for (const file of unexpectedFiles) {
      log(`   - ${file}`, "red");
    }
    return false;
  }

  for (const file of markdownFiles) {
    const lineCount = readFileSync(join(rootDir, file), "utf8")
      .split("\n")
      .length;
    if (lineCount > 1000) {
      log(`❌ ${file} exceeds 1000 lines (${lineCount})`, "red");
      return false;
    }
  }

  log(
    "✅ Only the approved project docs and repo-local custom agents are present",
    "green",
  );
  log("✅ All surviving markdown files are within the 1000-line limit", "green");

  return true;
}

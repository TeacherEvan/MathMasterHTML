// src/tools/scripts/verify/checks/documentation.js

import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { REQUIRED_DOCS } from "../verify.constants.js";
import { log, logSection } from "../verify.logging.js";

export function checkDocumentation(rootDir) {
  logSection("DOCUMENTATION CHECK");

  const docsPath = join(rootDir, "Docs");
  if (!existsSync(docsPath)) {
    log("❌ Docs folder not found!", "red");
    return false;
  }

  for (const doc of REQUIRED_DOCS) {
    const docPath = join(docsPath, doc);
    if (!existsSync(docPath)) {
      log(`⚠️  Missing recommended doc: ${doc}`, "yellow");
    }
  }

  const allDocs = readdirSync(docsPath).filter((f) => f.endsWith(".md"));
  log(`📚 Documentation files: ${allDocs.length}`, "cyan");

  if (existsSync(join(docsPath, "_INDEX.md"))) {
    log("✅ _INDEX.md exists (agent-friendly)", "green");
  } else {
    log("⚠️  _INDEX.md missing (recommended for agents)", "yellow");
  }

  if (existsSync(join(docsPath, "_AGENT_QUICKSTART.md"))) {
    log("✅ _AGENT_QUICKSTART.md exists", "green");
  } else {
    log("⚠️  _AGENT_QUICKSTART.md missing", "yellow");
  }

  return true;
}

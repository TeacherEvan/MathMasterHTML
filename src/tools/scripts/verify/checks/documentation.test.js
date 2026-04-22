import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import { REQUIRED_DOCS } from "../verify.constants.js";
import { checkDocumentation } from "./documentation.js";

function writeRequiredDocs(rootDir) {
  for (const doc of REQUIRED_DOCS) {
    const filePath = join(rootDir, doc);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, "# doc\n", "utf8");
  }
}

function writeMarkdown(rootDir, pathParts, content) {
  const filePath = join(rootDir, ...pathParts);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

test("allows repo-local custom agent markdown under .github/agents", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    const agentPath = join(
      rootDir,
      ".github",
      "agents",
      "using-superpowers.agent.md",
    );
    mkdirSync(dirname(agentPath), { recursive: true });
    writeFileSync(agentPath, "# Using Superpowers\n", "utf8");

    assert.equal(checkDocumentation(rootDir), true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("allows multiple repo-local custom agent markdown files", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    writeMarkdown(
      rootDir,
      [".github", "agents", "using-superpowers.agent.md"],
      "# Using Superpowers\n",
    );
    writeMarkdown(
      rootDir,
      [".github", "agents", "review-helper.agent.md"],
      "# Review Helper\n",
    );

    assert.equal(checkDocumentation(rootDir), true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("rejects markdown outside the repo-local custom agent pattern", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    const invalidAgentPath = join(
      rootDir,
      ".github",
      "agents",
      "using-superpowers.md",
    );
    mkdirSync(dirname(invalidAgentPath), { recursive: true });
    writeFileSync(invalidAgentPath, "# Invalid Agent Doc\n", "utf8");

    assert.equal(checkDocumentation(rootDir), false);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("rejects nested markdown under .github/agents", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    const nestedAgentPath = join(
      rootDir,
      ".github",
      "agents",
      "nested",
      "using-superpowers.agent.md",
    );
    mkdirSync(dirname(nestedAgentPath), { recursive: true });
    writeFileSync(nestedAgentPath, "# Nested Agent Doc\n", "utf8");

    assert.equal(checkDocumentation(rootDir), false);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("rejects .agent.md files outside .github/agents", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    const misplacedAgentPath = join(
      rootDir,
      ".github",
      "using-superpowers.agent.md",
    );
    mkdirSync(dirname(misplacedAgentPath), { recursive: true });
    writeFileSync(misplacedAgentPath, "# Misplaced Agent Doc\n", "utf8");

    assert.equal(checkDocumentation(rootDir), false);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("rejects oversized allowed agent markdown files", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    writeMarkdown(
      rootDir,
      [".github", "agents", "oversized.agent.md"],
      `${"line\n".repeat(1000)}line\n`,
    );

    assert.equal(checkDocumentation(rootDir), false);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test("ignores nested worktree markdown copies during documentation checks", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-docs-"));

  try {
    writeRequiredDocs(rootDir);

    writeMarkdown(
      rootDir,
      [".worktrees", "feature-copy", "README.md"],
      "# Worktree README copy\n",
    );
    writeMarkdown(
      rootDir,
      [".worktrees", "feature-copy", ".github", "agents", "using-superpowers.agent.md"],
      "# Worktree Agent Copy\n",
    );

    assert.equal(checkDocumentation(rootDir), true);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
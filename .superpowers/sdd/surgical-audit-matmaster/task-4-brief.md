# Task 4 Brief — P1: Fix Disguised PNG Binaries in .jpg Assets + Magic-Byte Header Check

**Source plan:** docs/plans/SurgicalAudit Matmaster.txt (Step 5, Prompt 4)
**BASE commit:** 8c99e35

## Context / Where this fits
Phase 2, Task 1 of the surgical remediation plan. Addresses P1 finding #2: Gameplay3.jpg and Level select.jpg are raw PNG binaries (magic bytes 89 50 4E 47) saved with .jpg extensions, byte-identical to their .png counterparts. They double screenshot payload size, waste Service Worker CacheStorage quota, and cause MIME-type sniffing mismatches.

## Verified current state
- `Gameplay3.jpg` (48,053 bytes) = byte-identical to `Gameplay3.png` (48,053 bytes); both start with `89 50 4E 47` (PNG)
- `Level select.jpg` (276,537 bytes) = byte-identical to `Level select.png` (276,537 bytes); both start with `89 50 4E 47` (PNG)
- **Zero references** to either .jpg file in src/, service-worker.js, manifest.json, or tests/
- manifest.json already references the .png versions (Gameplay3.png, Level%20select.png)
- `readImageMetadata()` in manifest-screenshots.js already detects PNG (0x89504E47) and JPEG (0xFFD8FF) magic bytes, but does NOT check that the file extension matches the actual content
- `manifest-screenshots.test.js` already tests type-mismatch detection but not extension/content mismatch

## Requirements (verbatim from Prompt 4)
1. Re-encode Gameplay3.jpg and Level select.jpg as genuine compressed JPEG files (quality 82) **or** remove the .jpg duplicates and update manifest.json and service-worker.js.
2. In `src/tools/scripts/verify/checks/manifest-screenshots.js` and `manifest-screenshots.test.js`, add a magic-byte header assertion verifying .png files start with 89 50 4E 47 and .jpg files start with FF D8 FF.

## Decision
**Remove the .jpg duplicates** (option 2 from Prompt 4) because:
- Zero references exist to either .jpg file anywhere
- manifest.json already uses the .png versions
- No service-worker.js or code references the .jpg files
- Removing is cleaner than re-encoding to lossy JPEG when lossless PNG originals already exist

## Report contract
Write full implementation report to `.superpowers/sdd/surgical-audit-matmaster/task-4-report.md`.
Return: status, commits, one-line test summary, concerns.

## Global constraints (binding)
- Remove .jpg files via `git rm` (preserve git history)
- Verify zero references remain to deleted .jpg files after removal (grep src/, tests/, service-worker.js, manifest.json)
- Add magic-byte header assertion to manifest-screenshots.js: every file checked must have magic bytes matching its extension (.png → 89 50 4E 47..., .jpg → FF D8 FF...)
- Wire the new check into verify.js and verify.checks.js
- Add a test in manifest-screenshots.test.js covering extension/content mismatch (e.g., a .jpg file with PNG magic bytes must fail)
- `npm run verify` must pass; `node --check` on modified JS files must pass
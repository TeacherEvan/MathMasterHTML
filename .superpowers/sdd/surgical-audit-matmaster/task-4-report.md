# Task 4 Report — P1: Fix Disguised PNG Binaries in .jpg Assets + Magic-Byte Header Check

**Repo:** MathMasterHTML
**Base commit:** 8c99e35
**Commit:** f4c176d `P1: remove disguised PNG .jpg assets + magic-byte extension check`
**Status:** DONE

## Summary of changes

### 1. Removed disguised PNG `.jpg` assets (via `git rm`)
- `src/assets/images/Images/Gameplay3.jpg` (raw PNG, magic bytes `89 50 4E 47`, byte-identical to `Gameplay3.png`)
- `src/assets/images/Images/Level select.jpg` (raw PNG, magic bytes `89 50 4E 47`, byte-identical to `Level select.png`)

Both were unreferenced: `manifest.json` already points to the `.png` versions (`Gameplay3.png`, `Level%20select.png`), and `service-worker.js` / `src/` / `tests/` contain no references to the `.jpg` files. Removal preserves git history.

### 2. Magic-byte header assertion — `src/tools/scripts/verify/checks/manifest-screenshots.js`
Added new exported function `checkImageExtensionMatchesContent(filePath)`:
- `.png` files must start with PNG signature `89 50 4E 47 0D 0A 1A 0A`
- `.jpg` files must start with JPEG SOI marker `FF D8 FF`
- Other extensions are not validated (returns true)

Integrated into `checkManifestScreenshots()`: after the file-exists check, each manifest screenshot is validated for extension/content alignment; a mismatch logs `❌ <prefix> extension does not match content: <src>` and fails the check. This closes the gap where `readImageMetadata()` detects the real format from magic bytes but never verifies the extension matches that content (e.g. a `.jpg` declared as `image/png` with real PNG content previously passed).

### 3. Wiring
- `src/tools/scripts/verify/verify.checks.js`: re-exports `checkImageExtensionMatchesContent` alongside `checkManifestScreenshots`.
- `src/tools/scripts/verify.js`: the check is enforced via the existing `manifestScreenshots` entry in the `results` object (`checkManifestScreenshots(ROOT)`), which now fails on extension/content mismatch. No separate redundant entry was added (that would re-scan the manifest).

### 4. Tests — `src/tools/scripts/verify/checks/manifest-screenshots.test.js`
Added two tests (all 10 pass):
- `fails when .jpg file has PNG magic bytes (extension/content mismatch)` — `.jpg` extension with real PNG content, declared type `image/png` so only the new assertion catches it.
- `fails when .png file has JPEG magic bytes (extension/content mismatch)` — symmetric case.

## Verification

| Check | Result |
|---|---|
| `npm run verify` | ✅ ALL CHECKS PASSED (8/8); `manifest screenshots valid (3)` |
| `node --check` manifest-screenshots.js | ✅ OK |
| `node --check` manifest-screenshots.test.js | ✅ OK |
| `node --check` verify.checks.js | ✅ OK |
| grep `Gameplay3.jpg\|Level select.jpg` in `src/` | NONE |
| grep `Gameplay3.jpg\|Level select.jpg` in `tests/` | NONE |
| grep in `service-worker.js` | NONE |
| grep in `manifest.json` | NONE |
| manifest.json still references | `Gameplay3.png`, `Level%20select.png` |

## One-line test summary
10/10 manifest-screenshots tests pass, including the two new extension-vs-content mismatch tests (`.jpg` with PNG bytes and `.png` with JPEG bytes both fail).

## Concerns
None. No references to the deleted `.jpg` files remain in `src/`, `tests/`, `service-worker.js`, or `manifest.json`. Pre-existing uncommitted modifications (`Plan Alpha.md`, `Plan Beta.md`, `Plan Genesis.md`, `README.md`, `verify/checks/documentation.js`, `verify/checks/verify.constants.js`, plus untracked `.superpowers/` and `docs/*`) were present before this task and were deliberately excluded from commit `f4c176d`.

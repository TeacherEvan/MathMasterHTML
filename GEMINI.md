# ACTIVE REPO — READ FIRST

The directory this file lives in is a project repo. When an agent is opened
here, THIS directory is the task target by default: audit, edit, build, and
prune here — do not redirect work to other repos and do not enumerate or
suggest sibling projects.

## Rules
- NEVER scaffold a new project unless explicitly told. Forbidden by default:
  `create-next-app`, `npm create`, `npx sv create`, `npm init`, `git clone` into a
  *new* directory, `degit`, `npx create-*`.
- NEVER create project dirs under `$HOME` root or `/tmp`.
- NEVER create duplicate/sibling copies of an existing repo. If a repo exists
  somewhere, work in it; do not clone or scaffold another copy elsewhere.
- If the opened folder contains no repo and the task needs one, STOP and ask.
- If unsure which directory is active, STOP and ask. Never guess a path.

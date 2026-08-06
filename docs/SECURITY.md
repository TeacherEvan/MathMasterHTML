# Security: Output Escaping Rule

## The rule

Never interpolate untrusted data into `innerHTML` (or any DOM-XSS sink) without
escaping it first through the canonical escaper:

```javascript
window.DomSanitizer.escapeHTML(value);
```

The escaper is defined in `src/scripts/utils-sanitizer.js` and is loaded on
**every** page (`index.html`, `life-stats.html`, `level-select.html`,
`game.html`) as the first `<body>` script, before any page module. It is
therefore always available — do not add a local fallback or a local copy.

## Why

- There used to be three independently maintained escape helpers
  (`index-page.scoreboard.render.js`, `ux-toast.js`, the life-stats modules) and
  a loading gap that let `life-stats.html` ship with no escaping at all
  (see `docs/plan-output-escaping-hardening.md`).
- A single canonical escaper means one place to audit and one place to fix.
  The next author cannot "miss" it because it is already global.

## Do

- Use `window.DomSanitizer.escapeHTML(...)` for any string that reaches
  `innerHTML`, `outerHTML`, `insertAdjacentHTML`, etc., when the value derives
  from user/stored input (player name, scoreboard labels, life-stats field
  labels/units/notes, custom field names, toasts fed by app messages, etc.).
- Prefer `textContent` / `setAttribute` over building HTML when no markup is
  needed — that is the safest escape of all.

## Do NOT

- Do not reintroduce a local `escapeHtml` / `esc` helper. Migrate to the
  canonical one.
- Do not add `window.DomSanitizer ? ... : fallback` guards — the global is
  guaranteed loaded on all pages.
- Do not route trusted same-origin static component HTML (e.g. lock components
  loaded via the lazy component loader) through the escaper unless those
  components ever carry user input.

## Exceptions (documented, not fixed)

- `lock-manager.loader.js` injects fetched first-party component HTML. Trust
  boundary is same-origin static content; treat as trusted unless components
  ever carry user input.
- `style-src 'unsafe-inline'` is retained (required for dynamic chart colors);
  this is accepted scope, not a regression.

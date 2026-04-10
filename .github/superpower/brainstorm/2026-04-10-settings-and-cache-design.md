# Design: Settings Feature and Deployment Cache Handling
**Date:** 2026-04-10
**Status:** Approved
**Scope Tier:** Production
**Author:** Brainstorm session with user

## Problem Statement
Math Master needs a dedicated settings feature so players can control display, language, and sound behavior without mixing those preferences into gameplay progress storage. The game also needs a safer deployment-cache strategy so service worker updates do not leave some devices running stale entrypoints or mismatched asset graphs after a new branch deployment.

## Success Metrics
- [ ] Players can update display, language, and sound preferences from level select.
- [ ] Settings persist across reloads, offline use, and service-worker-driven updates.
- [ ] New deployments do not force-refresh an active gameplay run.
- [ ] Users on stale cached builds receive a clear recovery path.
- [ ] Existing verification, typecheck, and targeted Playwright lanes remain green.

## Constraints
| Category | Constraint | Source |
|----------|-----------|--------|
| Technical | Runtime remains browser-native script tags with `window.*` globals | Architecture guide |
| Technical | Cross-subsystem integration should use DOM events, not direct module coupling | Development guide |
| Storage | localStorage access must stay try/catch safe with graceful fallback behavior | Existing persistence modules |
| UX | Primary settings entrypoint should be level select | User decision |
| Localization | First release localizes UI and onboarding text only, not gameplay problem content | User decision |
| Deployment | Cache and service worker strategy must avoid stale old/new runtime mixing during active play | User request + service worker best practices |

## Design

### Architecture Overview
Add a dedicated settings subsystem separate from player progress.

- `src/scripts/user-settings.helpers.js`: schema defaults, normalization, migration, key/version constants
- `src/scripts/user-settings.js`: load/save/update API, event dispatch, `window.UserSettings` registration
- Level-select UI owns the primary settings surface
- Consumers such as quality, audio, and localized copy listen for settings changes through DOM events

Settings are orthogonal to score, achievements, console state, and problem progression. Existing stores remain unchanged except where they consume settings.

### Components
1. Settings storage layer
   - Key: `mathmaster_user_settings_v1`
   - Versioned payload with migration hook similar to player storage
   - Safe read/write wrappers with fallback to defaults if storage is unavailable

2. Settings controller API
   - `getSettings()`
   - `updateSettings(partial)`
   - `resetSettings()`
   - `getDisplaySettings()` / `getLanguageSettings()` / `getSoundSettings()` if needed for ergonomics

3. Level-select settings UI
   - Main entrypoint for opening the settings surface
   - Writes through the controller API only
   - Shows update/recovery controls when a new build is available

4. Consumer integrations
   - Quality tier manager reads optional display override
   - Audio state applies mute and future music/effects toggles
   - Page copy/onboarding uses the selected locale for UI text

### Data Flow
1. Level-select boot initializes `window.UserSettings`.
2. Settings load from localStorage, normalize through the current schema version, and fall back to defaults if invalid.
3. UI renders the current settings state.
4. When a player changes a setting, the controller persists the updated object and dispatches a shared event.
5. Display, audio, and localization consumers react independently.
6. On future loads, boot code reapplies the persisted settings before or during subsystem initialization.

### Settings Schema
```json
{
  "version": 1,
  "display": {
    "qualityMode": "auto",
    "reducedMotion": false,
    "fullscreenPreferred": false
  },
  "language": {
    "locale": "en-US"
  },
  "sound": {
    "muted": false,
    "musicEnabled": true,
    "effectsEnabled": true
  },
  "updatedAt": 0
}
```

### API Contract
Internal runtime contract only. No server API required.

Suggested events:
- `userSettingsLoaded`
- `userSettingsChanged`
- `appUpdateAvailable`

Suggested event detail shape:
```javascript
{
  settings,
  changedKeys,
  source
}
```

### Error Handling
- Invalid or missing settings payload: normalize or reset to defaults.
- localStorage read/write failure: continue with in-memory defaults and non-blocking warning logs.
- Unsupported display/audio capability: ignore the unsupported field and preserve the rest.
- Translation key missing: fall back to the default locale string.

## Deployment Cache Strategy

### Goals
- Avoid stale HTML pinning old script graphs.
- Avoid force-refreshing active gameplay sessions.
- Ensure each deploy has isolated cache names.
- Keep service worker recovery available for broken clients.

### Strategy
1. Keep the service worker URL stable at `/service-worker.js`.
2. Introduce a shared build version constant used by the service worker and registration layer.
3. Version cache names by build, using a Math Master specific prefix.
4. Use network-first for navigation documents so current HTML wins when online.
5. Clear only Math Master caches during activate.
6. Detect waiting/updated workers in the registration script.
7. Do not auto-reload active gameplay. Surface an update notice on level select or after a run instead.
8. Persist settings before any controlled reload path.
9. Keep a manual cache-clear recovery action for stale or corrupted clients.

### Update UX
- If a new worker is waiting, mark the app as update-ready.
- If the player is on level select, show a refresh prompt immediately.
- If the player is mid-run, defer the prompt until gameplay ends or the user returns to level select.
- Offer a manual “refresh now” action outside gameplay.

## Alternatives Considered
| Approach | Pros | Cons | Why Rejected |
|----------|------|------|-------------|
| Immediate force refresh on update | Fastest rollout to latest build | Highest risk of mixed old/new runtime state during active play | Too disruptive and error-prone for a game session |
| Reuse player profile for settings | Fewer files | Couples unrelated concerns and complicates migrations | Settings should remain orthogonal to progress |
| Full gameplay localization in v1 | More ambitious language support | Problem content and gameplay copy expansion add high complexity | Not needed for the first production release |
| In-game-only settings modal | Convenient during play | Adds mid-run state churn and more integration complexity | Level select is a safer primary entrypoint |

## Risk Analysis
| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|-----------|-------|
| Old HTML references old assets after deploy | Medium | High | Network-first navigation, build-scoped cache names, activate cleanup | Runtime implementation |
| New worker interrupts active gameplay | Medium | High | Defer update prompt until between sessions | Runtime implementation |
| localStorage unavailable or corrupted | Medium | Medium | Safe wrappers, normalization, fallback defaults | Settings subsystem |
| Quality override conflicts with auto tier behavior | Medium | Medium | Centralize override handling in the quality manager and emit explicit change events | Display subsystem |
| Language setting expands beyond current copy structure | Medium | Medium | Limit v1 to UI and onboarding text only | UI/localization work |

## Complexity Budget
| Element | Cost Level | Justification |
|---------|-----------|---------------|
| New settings storage subsystem | Medium | Necessary, isolated feature boundary |
| Level-select settings UI | Medium | Primary UX surface |
| Localization layer for UI/onboarding copy | Medium | Needed for language support but scoped away from gameplay content |
| Service worker versioning cleanup | High | Required for safe deployment behavior |
| Deferred update UX | Medium | Prevents active-session disruption |

**Total complexity:** Within budget for Production scope because the work reuses existing script-tag, event-driven, and local-storage patterns rather than introducing new infrastructure.

## Rollback Plan
- **Before launch:** Remove settings entrypoint and runtime registrations, revert the new storage key usage, and revert service worker versioning changes.
- **After launch:** Hide the settings UI behind a simple runtime gate if needed, fall back to default settings behavior, and disable update prompts while keeping cache clear available.
- **Data recovery:** If the settings payload is invalid, reset to defaults. Progress data remains unaffected because it is stored separately.

## What This Design Does NOT Do
- Does not add cloud sync or account-based settings.
- Does not localize gameplay problem content in v1.
- Does not require mid-run live locale switching.
- Does not merge settings into player profile storage.
- Does not force-refresh a live run when a new deployment arrives.

## Open Questions
- [ ] Whether the audio system cleanly supports separate music/effects toggles immediately, or whether v1 should ship with master mute first and expand after implementation review.
- [ ] Whether fullscreen preference should be exposed in the first UI or kept behind capability detection.

## Testing Strategy
- Unit-style coverage for settings normalization, migration, and safe storage wrappers.
- Playwright coverage for settings persistence across reload and navigation.
- Playwright coverage for display override application on first load.
- Playwright coverage for UI/onboarding locale changes.
- Playwright coverage for service worker update-available state and deferred prompt behavior.
- Regression checks with `npm run verify`, `npm run typecheck`, and focused relevant Playwright lanes.
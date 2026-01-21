# File Index and Metadata

This document provides a comprehensive index of all files and directories in the MathMasterHTML project, including metadata such as purpose, dependencies, and size information.

## Directory Structure

```
MathMasterHTML/
├── src/
│   ├── pages/                 # HTML pages
│   ├── scripts/               # JavaScript modules
│   ├── styles/                # CSS stylesheets
│   ├── assets/                # Static assets
│   │   ├── problems/          # Math problem data
│   │   ├── images/            # Image assets
│   │   └── components/        # HTML components
│   ├── tools/                 # Utility scripts
│   └── types/                 # TypeScript definitions
├── tests/                     # Test files
├── docs/                      # Documentation
└── (root config files)
```

## File Index

### Pages (src/pages/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| index.html | Welcome screen with Matrix theme | CSS: game.css, modern-ux-enhancements.css | ~5KB |
| level-select.html | Difficulty level selection | CSS: game.css, level-select.css | ~3KB |
| game.html | Main game interface | Multiple JS modules, CSS files | ~15KB |

### Scripts (src/scripts/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| game.js | Main game logic, problem solving | utils.js, problem-loader.js | ~50KB |
| lock-manager.js | Progressive lock animation system | None | ~25KB |
| worm.js | Enemy mechanics system | worm-*.js modules | ~10KB |
| console-manager.js | Quick access console | None | ~15KB |
| 3rdDISPLAY.js | Symbol rain rendering | None | ~8KB |
| utils.js | Shared utilities | None | ~5KB |
| constants.js | Game constants | None | ~2KB |
| ... (other modules) | Various game features | Related modules | Varies |

### Styles (src/styles/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| game.css | Three-panel layout | None | ~10KB |
| game-animations.css | CSS animations | None | ~5KB |
| console.css | Console styling | None | ~3KB |
| worm-base.css | Worm base styles | None | ~4KB |
| ... | Other styles | None | Varies |

### Assets
| Directory | Purpose | Contents |
|-----------|---------|----------|
| problems/ | Math problem data | Markdown files with algebra problems |
| images/ | Game images | Screenshots, icons |
| components/ | HTML components | Lock animation components |

### Tools (src/tools/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| verify.js | Build verification script | None | ~2KB |
| solver.js | Problem solving utility | None | ~3KB |

### Types (src/types/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| global.d.ts | Global type definitions | None | ~1KB |

### Tests (tests/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| managers.spec.js | Manager class tests | Playwright | ~5KB |
| ... | Other test files | Playwright | Varies |

### Docs (docs/)
| File | Purpose | Size |
|------|---------|------|
| README.md | Project documentation | ~20KB |
| ... | Various docs | Varies |

### Root Files
| File | Purpose | Size |
|------|---------|------|
| package.json | NPM configuration | ~2KB |
| manifest.json | PWA manifest | ~1KB |
| service-worker.js | Service worker | ~3KB |
| ... | Config files | Varies |

## Dependencies Overview

- **Global Dependencies**: None (vanilla JS)
- **Build Dependencies**: ESLint, TypeScript, Playwright
- **Runtime Dependencies**: None
- **Asset Dependencies**: Google Fonts (Orbitron)

## Notes

- All paths updated for new structure
- File sizes are approximate
- Dependencies listed are direct imports/references
- Structure follows vanilla JS best practices
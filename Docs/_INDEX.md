# MathMaster Documentation Index
>
> **⚡ AGENT PRIORITY FILE** - Start here for project navigation

## 📋 Quick Navigation

| Category | Primary File | Purpose |
|----------|--------------|---------|
| 🚀 **Start Here** | [_AGENT_QUICKSTART.md](./_AGENT_QUICKSTART.md) | Fast onboarding for AI agents |
| 📐 **Architecture** | [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, component overview |
| 🔧 **Development** | [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Setup, coding standards |
| 🐛 **Worm System** | [WORM_DEVELOPER_GUIDE.md](./WORM_DEVELOPER_GUIDE.md) | Enemy AI, power-ups |
| 📊 **Session Log** | [_SESSION_LOG.md](./_SESSION_LOG.md) | Recent changes, bug fixes |

---

## 📁 Documentation Categories

### 🏗️ Architecture & Design

| File | Description | Last Updated |
|------|-------------|--------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Overall system architecture, panels, data flow | Core |
| [MathMasterHTML.mdc](../MathMasterHTML.mdc) | Original game specification (C# reference) | Reference |

### 🔧 Development Guides

| File | Description | Priority |
|------|-------------|----------|
| [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) | Setup, npm scripts, debugging | ⭐⭐⭐ |
| [WORM_DEVELOPER_GUIDE.md](./WORM_DEVELOPER_GUIDE.md) | Worm system deep dive | ⭐⭐⭐ |
| [WORM_TESTING_GUIDE.md](./WORM_TESTING_GUIDE.md) | Console commands for testing | ⭐⭐ |
| [PERFORMANCE.md](./PERFORMANCE.md) | Optimization techniques | ⭐⭐ |

### 🐛 Worm System (Enemy AI)

| File | Description | Status |
|------|-------------|--------|
| [WORM_DEVELOPER_GUIDE.md](./WORM_DEVELOPER_GUIDE.md) | Complete worm API reference | ✅ Current |
| [WORM_TESTING_GUIDE.md](./WORM_TESTING_GUIDE.md) | Test scenarios, console commands | ✅ Current |
| [WORM_QUALITY_AUDIT_REPORT.md](./WORM_QUALITY_AUDIT_REPORT.md) | Code quality analysis | 📋 Reference |
| [WORM_REFACTORING_SUMMARY.md](./WORM_REFACTORING_SUMMARY.md) | Refactoring history | 📋 Reference |
| [WORM_REFACTORING_PLAN.md](./WORM_REFACTORING_PLAN.md) | Future refactoring ideas | 📋 Reference |
| [WORM_ES6_MODULES_ASSESSMENT.md](./WORM_ES6_MODULES_ASSESSMENT.md) | Module migration analysis | 📋 Reference |
| [WORM_AUDIT_SUMMARY.md](./WORM_AUDIT_SUMMARY.md) | Audit findings summary | 📋 Reference |
| [PRAGMATIC_WORM_REFACTORING_PLAN.md](./PRAGMATIC_WORM_REFACTORING_PLAN.md) | Practical refactoring steps | 📋 Reference |

### 📊 Reports & Summaries

| File | Description | Date |
|------|-------------|------|
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Feature implementation log | Historical |
| [IMPLEMENTATION_SUMMARY_OPTIMIZATION_2025.md](./IMPLEMENTATION_SUMMARY_OPTIMIZATION_2025.md) | 2025 optimization work | 2025 |
| [OPTIMIZATION_REPORT_2025.md](./OPTIMIZATION_REPORT_2025.md) | Performance improvements | 2025 |
| [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) | Code restructuring log | Historical |
| [FEATURE_FINE_TUNING_SUMMARY.md](./FEATURE_FINE_TUNING_SUMMARY.md) | Feature adjustments | Historical |
| [TESTING_REPORT_FEATURE_TUNING.md](./TESTING_REPORT_FEATURE_TUNING.md) | Test results | Historical |
| [Phase_3_Animate_Refactoring_Summary.md](./Phase_3_Animate_Refactoring_Summary.md) | Animation refactoring | Historical |

---

## 🔑 Key Concepts Quick Reference

### Panel System

- **Panel A**: Falling symbols (rain) - user clicks to reveal
- **Panel B**: Solution display - shows equation with hidden/revealed symbols
- **Panel C**: Third display / console area

### Worm Types

| Type | Color | Behavior | Kill Method |
|------|-------|----------|-------------|
| Console | Green | Spawns from console, steals, returns | Click worm |
| Border | Green | Spawns from edges, roams | Click worm |
| Purple | Purple | Rushes symbols, clones on click | Click matching rain symbol |

### Power-Ups

| Icon | Name | Effect |
|------|------|--------|
| ⚡ | Chain Lightning | Kills 5+ worms |
| 🕷️ | Spider | Converts worms to spiders |
| 👹 | Devil | Magnet that attracts and kills worms |

---

## 📂 File Structure Reference

```
MathMasterHTML/
├── 📄 game.html          # Main game page
├── 📄 index.html         # Welcome screen
├── 📄 level-select.html  # Level selection
├── 📄 package.json       # npm config
├── 📁 js/                # JavaScript source
│   ├── worm.js           # Main worm system (2200+ lines)
│   ├── worm-*.js         # Worm subsystems
│   ├── game.js           # Game logic
│   ├── constants.js      # Configuration
│   └── utils.js          # Utilities
├── 📁 css/               # Stylesheets
│   ├── worm-base.css     # Worm styles
│   ├── worm-effects.css  # Worm animations
│   └── game.css          # Game styles
├── 📁 Docs/              # Documentation (you are here)
├── 📁 Assets/            # Problem sets by level
└── 📁 scripts/           # Build/verify scripts
```

---

## 🤖 For AI Agents

**Recommended reading order:**

1. `_AGENT_QUICKSTART.md` - Essential patterns and gotchas
2. `_SESSION_LOG.md` - Recent context
3. `DEVELOPMENT_GUIDE.md` - Full reference
4. Specific guide based on task

**Search hints:**

- Worm bugs → Check `WORM_DEVELOPER_GUIDE.md` troubleshooting section
- Animation issues → Check `css/worm-base.css` and `worm-effects.css`
- Performance → Check `PERFORMANCE.md` and `constants.js`

---

*Last updated: 2025-11-26*
*Maintained by: AI Agent System*

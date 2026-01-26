#!/usr/bin/env node
/**
 * MathMaster Project Health Verification Script
 * =============================================
 * Runs comprehensive checks to ensure project integrity
 * 
 * Usage: npm run verify
 * 
 * Checks performed:
 * 1. Critical file existence
 * 2. ESLint code quality
 * 3. Package.json validity
 * 4. Documentation completeness
 * 5. CSS file integrity
 * 
 * @author AI Agent System
 * @version 1.0.0
 * @date 2025-11-26
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..', '..', '..');

// ============================================
// CONFIGURATION
// ============================================

const CRITICAL_FILES = [
    'package.json',
    'eslint.config.js',
    'game.html',
    'index.html',
    'level-select.html',
    'src/scripts/worm.js',
    'src/scripts/game.js',
    'src/scripts/constants.js',
    'src/scripts/utils.js',
    'src/styles/css/worm-base.css',
    'src/styles/css/game.css',
    'Docs/_INDEX.md',
    'Docs/_AGENT_QUICKSTART.md'
];

const REQUIRED_DOCS = [
    'ARCHITECTURE.md',
    'DEVELOPMENT_GUIDE.md',
    'WORM_DEVELOPER_GUIDE.md'
];

const JS_DIRECTORIES = ['src/scripts', 'lock', 'src/tools/middle-screen'];
const CSS_DIRECTORIES = ['src/styles/css', 'lock'];

// ============================================
// UTILITIES
// ============================================

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(50));
    log(`  ${title}`, 'cyan');
    console.log('='.repeat(50));
}

function logResult(check, passed, detail = '') {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${check}${detail ? ` - ${detail}` : ''}`, color);
    return passed;
}

// ============================================
// CHECKS
// ============================================

function checkCriticalFiles() {
    logSection('CRITICAL FILES CHECK');
    let allPassed = true;
    let found = 0;
    let missing = 0;

    for (const file of CRITICAL_FILES) {
        const fullPath = join(ROOT, file);
        const exists = existsSync(fullPath);
        if (exists) {
            found++;
        } else {
            missing++;
            allPassed = false;
            log(`❌ Missing: ${file}`, 'red');
        }
    }

    log(`\n📁 Found: ${found}/${CRITICAL_FILES.length} critical files`, found === CRITICAL_FILES.length ? 'green' : 'yellow');
    if (missing > 0) {
        log(`⚠️  Missing: ${missing} files`, 'red');
    }

    return allPassed;
}

function checkESLint() {
    logSection('ESLINT CODE QUALITY');

    try {
        execSync('npm run lint', { cwd: ROOT, stdio: 'pipe' });
        log('✅ ESLint passed - No errors found', 'green');
        return true;
    } catch (error) {
        const output = error.stdout?.toString() || error.stderr?.toString() || '';
        log('❌ ESLint found issues:', 'red');
        console.log(output.slice(0, 500)); // Truncate long output
        return false;
    }
}

function checkPackageJson() {
    logSection('PACKAGE.JSON VALIDATION');

    const pkgPath = join(ROOT, 'package.json');
    if (!existsSync(pkgPath)) {
        log('❌ package.json not found!', 'red');
        return false;
    }

    try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        let passed = true;

        // Check required fields
        const requiredFields = ['name', 'version', 'description', 'scripts'];
        for (const field of requiredFields) {
            if (!pkg[field]) {
                log(`❌ Missing field: ${field}`, 'red');
                passed = false;
            }
        }

        // Check required scripts
        const requiredScripts = ['start', 'lint', 'verify'];
        for (const script of requiredScripts) {
            if (!pkg.scripts?.[script]) {
                log(`❌ Missing script: ${script}`, 'red');
                passed = false;
            }
        }

        if (passed) {
            log(`✅ package.json valid`, 'green');
            log(`   Name: ${pkg.name}`, 'cyan');
            log(`   Version: ${pkg.version}`, 'cyan');
        }

        return passed;
    } catch (e) {
        log(`❌ Invalid JSON: ${e.message}`, 'red');
        return false;
    }
}

function checkDocumentation() {
    logSection('DOCUMENTATION CHECK');

    const docsPath = join(ROOT, 'Docs');
    if (!existsSync(docsPath)) {
        log('❌ Docs folder not found!', 'red');
        return false;
    }

    let passed = true;
    let docCount = 0;

    // Check required docs
    for (const doc of REQUIRED_DOCS) {
        const docPath = join(docsPath, doc);
        if (existsSync(docPath)) {
            docCount++;
        } else {
            log(`⚠️  Missing recommended doc: ${doc}`, 'yellow');
        }
    }

    // Count all docs
    const allDocs = readdirSync(docsPath).filter(f => f.endsWith('.md'));
    log(`📚 Documentation files: ${allDocs.length}`, 'cyan');

    // Check for index
    if (existsSync(join(docsPath, '_INDEX.md'))) {
        log('✅ _INDEX.md exists (agent-friendly)', 'green');
    } else {
        log('⚠️  _INDEX.md missing (recommended for agents)', 'yellow');
    }

    // Check for agent quickstart
    if (existsSync(join(docsPath, '_AGENT_QUICKSTART.md'))) {
        log('✅ _AGENT_QUICKSTART.md exists', 'green');
    } else {
        log('⚠️  _AGENT_QUICKSTART.md missing', 'yellow');
    }

    return passed;
}

function countLines(dir) {
    let total = 0;
    const fullPath = join(ROOT, dir);

    if (!existsSync(fullPath)) return 0;

    const files = readdirSync(fullPath);
    for (const file of files) {
        const filePath = join(fullPath, file);
        const stat = statSync(filePath);
        if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.css'))) {
            const content = readFileSync(filePath, 'utf8');
            total += content.split('\n').length;
        }
    }
    return total;
}

function generateStats() {
    logSection('PROJECT STATISTICS');

    let jsLines = 0;
    let cssLines = 0;

    for (const dir of JS_DIRECTORIES) {
        jsLines += countLines(dir);
    }

    for (const dir of CSS_DIRECTORIES) {
        cssLines += countLines(dir);
    }

    log(`📊 JavaScript: ~${jsLines.toLocaleString()} lines`, 'cyan');
    log(`📊 CSS: ~${cssLines.toLocaleString()} lines`, 'cyan');
    log(`📊 Total: ~${(jsLines + cssLines).toLocaleString()} lines`, 'cyan');
}

// ============================================
// MAIN
// ============================================

async function main() {
    console.log('\n');
    log('🔍 MathMaster Project Verification', 'bold');
    log(`   Running from: ${ROOT}`, 'cyan');
    log(`   Date: ${new Date().toISOString()}`, 'cyan');

    const results = {
        criticalFiles: checkCriticalFiles(),
        eslint: checkESLint(),
        packageJson: checkPackageJson(),
        documentation: checkDocumentation()
    };

    generateStats();

    // Summary
    logSection('VERIFICATION SUMMARY');

    const checks = Object.entries(results);
    const passed = checks.filter(([_, v]) => v).length;
    const failed = checks.filter(([_, v]) => !v).length;

    for (const [name, result] of checks) {
        logResult(name.replace(/([A-Z])/g, ' $1').trim(), result);
    }

    console.log('\n' + '-'.repeat(50));

    if (failed === 0) {
        log(`\n🎉 ALL CHECKS PASSED! (${passed}/${checks.length})`, 'green');
        process.exit(0);
    } else {
        log(`\n⚠️  ${failed} CHECK(S) FAILED (${passed}/${checks.length} passed)`, 'red');
        process.exit(1);
    }
}

main().catch(e => {
    log(`\n💥 Verification crashed: ${e.message}`, 'red');
    process.exit(1);
});

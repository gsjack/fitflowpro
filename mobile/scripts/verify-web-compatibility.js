#!/usr/bin/env node
/**
 * Web Compatibility Verification Script
 *
 * Validates that:
 * 1. All required web shims exist
 * 2. Database functions handle web platform correctly
 * 3. No direct expo-sqlite imports in core code
 * 4. Metro config is properly configured
 *
 * Run: node scripts/verify-web-compatibility.js
 */

const fs = require('fs');
const path = require('path');

const MOBILE_ROOT = path.join(__dirname, '..');
const REQUIRED_FILES = [
  'expo-sqlite.web.js',
  'react-native-screens.web.js',
  'metro.config.js',
  'src/database/sqliteWrapper.ts',
  'src/database/db.ts',
  'tests/web-compatibility.test.ts',
  'WEB_COMPATIBILITY.md',
];

const CRITICAL_SOURCE_FILES = [
  'src/database/db.ts',
  'src/database/sqliteWrapper.ts',
  'src/services/database/workoutDb.ts',
  'src/services/database/programDb.ts',
  'src/services/database/recoveryDb.ts',
];

console.log('🔍 Verifying Web Compatibility...\n');

// Test 1: Check required files exist
console.log('📁 Test 1: Checking required files...');
let filesOk = true;
for (const file of REQUIRED_FILES) {
  const filePath = path.join(MOBILE_ROOT, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    filesOk = false;
  }
}

if (!filesOk) {
  console.error('\n❌ Some required files are missing!');
  process.exit(1);
}

console.log('\n✅ All required files exist\n');

// Test 2: Validate no direct expo-sqlite imports
console.log('📦 Test 2: Checking for direct expo-sqlite imports...');
let importsOk = true;

for (const file of CRITICAL_SOURCE_FILES) {
  const filePath = path.join(MOBILE_ROOT, file);
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check for direct import (not type-only)
  const directImport = /import\s+(?!type\s).*from\s+['"]expo-sqlite['"]/g.test(content);
  const namespaceImport = /import\s+\*\s+as\s+\w+\s+from\s+['"]expo-sqlite['"]/g.test(content);

  if (directImport || namespaceImport) {
    console.log(`  ❌ ${file} - Contains direct expo-sqlite import`);
    importsOk = false;
  } else {
    console.log(`  ✅ ${file} - No direct imports`);
  }
}

if (!importsOk) {
  console.error('\n❌ Found direct expo-sqlite imports! Use type-only imports or wrapper.');
  process.exit(1);
}

console.log('\n✅ No direct expo-sqlite imports found\n');

// Test 3: Verify sqliteWrapper uses type-only import
console.log('🔧 Test 3: Validating sqliteWrapper.ts...');
const wrapperPath = path.join(MOBILE_ROOT, 'src/database/sqliteWrapper.ts');
const wrapperContent = fs.readFileSync(wrapperPath, 'utf-8');

const hasTypeOnlyImport = /import\s+type\s+\*\s+as\s+SQLite\s+from\s+['"]expo-sqlite['"]/g.test(
  wrapperContent
);
const hasDynamicRequire = /require\s*\(\s*['"]expo-sqlite['"]\s*\)/g.test(wrapperContent);
const hasWebCheck = /Platform\.OS\s*===\s*['"]web['"]/g.test(wrapperContent);

if (!hasTypeOnlyImport) {
  console.log('  ❌ Missing type-only import');
  process.exit(1);
}
console.log('  ✅ Has type-only import');

if (!hasDynamicRequire) {
  console.log('  ❌ Missing dynamic require()');
  process.exit(1);
}
console.log('  ✅ Has dynamic require()');

if (!hasWebCheck) {
  console.log('  ❌ Missing web platform check');
  process.exit(1);
}
console.log('  ✅ Has web platform check');

console.log('\n✅ sqliteWrapper.ts is correctly configured\n');

// Test 4: Verify db.ts uses wrapper types
console.log('📊 Test 4: Validating db.ts...');
const dbPath = path.join(MOBILE_ROOT, 'src/database/db.ts');
const dbContent = fs.readFileSync(dbPath, 'utf-8');

const importsSQLiteDatabase = /(?:import.*SQLiteDatabase|type SQLiteDatabase).*(?:from.*sqliteWrapper|sqliteWrapper)/gs.test(dbContent);
const importsSQLiteRunResult = /(?:import.*SQLiteRunResult|type SQLiteRunResult).*(?:from.*sqliteWrapper|sqliteWrapper)/gs.test(dbContent);
const dbHasWebCheck = /Platform\.OS\s*===\s*['"]web['"]/g.test(dbContent);

if (!importsSQLiteDatabase) {
  console.log('  ❌ Missing SQLiteDatabase import from wrapper');
  process.exit(1);
}
console.log('  ✅ Imports SQLiteDatabase from wrapper');

if (!importsSQLiteRunResult) {
  console.log('  ❌ Missing SQLiteRunResult import from wrapper');
  process.exit(1);
}
console.log('  ✅ Imports SQLiteRunResult from wrapper');

if (!dbHasWebCheck) {
  console.log('  ❌ Missing web platform check');
  process.exit(1);
}
console.log('  ✅ Has web platform check');

console.log('\n✅ db.ts is correctly configured\n');

// Test 5: Verify Metro config
console.log('⚙️  Test 5: Validating metro.config.js...');
const metroPath = path.join(MOBILE_ROOT, 'metro.config.js');
const metroContent = fs.readFileSync(metroPath, 'utf-8');

const hasResolveRequest = /resolveRequest\s*:\s*\(context,\s*moduleName,\s*platform\)/g.test(
  metroContent
);
const hasSQLiteWebShim = /expo-sqlite\.web\.js/g.test(metroContent);
const hasScreensWebShim = /react-native-screens\.web\.js/g.test(metroContent);

if (!hasResolveRequest) {
  console.log('  ❌ Missing resolveRequest function');
  process.exit(1);
}
console.log('  ✅ Has resolveRequest function');

if (!hasSQLiteWebShim) {
  console.log('  ❌ Missing expo-sqlite.web.js resolution');
  process.exit(1);
}
console.log('  ✅ Resolves expo-sqlite.web.js');

if (!hasScreensWebShim) {
  console.log('  ❌ Missing react-native-screens.web.js resolution');
  process.exit(1);
}
console.log('  ✅ Resolves react-native-screens.web.js');

console.log('\n✅ metro.config.js is correctly configured\n');

// Test 6: Verify web shims have required exports
console.log('🌐 Test 6: Validating web shims...');

const sqliteShimPath = path.join(MOBILE_ROOT, 'expo-sqlite.web.js');
const screensShimPath = path.join(MOBILE_ROOT, 'react-native-screens.web.js');

const sqliteShim = fs.readFileSync(sqliteShimPath, 'utf-8');
if (!sqliteShim.includes('export') || !sqliteShim.includes('openDatabaseAsync')) {
  console.log('  ❌ expo-sqlite.web.js missing required exports');
  process.exit(1);
}
console.log('  ✅ expo-sqlite.web.js has required exports');

const screensShim = fs.readFileSync(screensShimPath, 'utf-8');
if (!screensShim.includes('export') || !screensShim.includes('enableScreens')) {
  console.log('  ❌ react-native-screens.web.js missing required exports');
  process.exit(1);
}
console.log('  ✅ react-native-screens.web.js has required exports');

console.log('\n✅ All web shims are valid\n');

// Test 7: Check for Platform.OS === 'web' guards
console.log('🛡️  Test 7: Checking for web platform guards...');
const dbHasWebGuards = (dbContent.match(/Platform\.OS\s*===\s*['"]web['"]/g) || []).length >= 1;
const wrapperHasWebGuards =
  (wrapperContent.match(/Platform\.OS\s*===\s*['"]web['"]/g) || []).length >= 1;

if (!dbHasWebGuards) {
  console.log('  ❌ db.ts missing web platform guards');
  process.exit(1);
}
console.log('  ✅ db.ts has web platform guards');

if (!wrapperHasWebGuards) {
  console.log('  ❌ sqliteWrapper.ts missing web platform guards');
  process.exit(1);
}
console.log('  ✅ sqliteWrapper.ts has web platform guards');

console.log('\n✅ All platform guards in place\n');

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ ALL WEB COMPATIBILITY CHECKS PASSED!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('Next steps:');
console.log('  1. Run tests: npm run test:unit -- web-compatibility.test.ts');
console.log('  2. Start web server: npm run web');
console.log('  3. Check browser console for "[DB] Web platform" messages');
console.log('  4. Verify no "Unimplemented" errors\n');

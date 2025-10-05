#!/usr/bin/env python3
"""
Batch fix E2E tests for Expo Router v6 compatibility.
Replaces common patterns with test helper functions.
"""

import re
import sys
from pathlib import Path

REPLACEMENTS = [
    # Navigation fixes
    (r"await page\.goto\(\`\$\{APP_URL\}/\(auth\)/login\`\);?\s*await page\.waitForLoadState\('networkidle'\);?",
     "await navigateToLogin(page);"),
    (r"await page\.goto\(\`\$\{APP_URL\}/\(auth\)/register\`\);?\s*await page\.waitForLoadState\('networkidle'\);?",
     "await navigateToRegister(page);"),
    (r"await page\.goto\(APP_URL\);?\s*await page\.waitForLoadState\('networkidle'\);?",
     "await navigateToLogin(page); // Unauthenticated users redirect to login"),

    # Storage fixes
    (r"await page\.evaluate\(\(\) => localStorage\.getItem\('@fitflow/auth_token'\)\)",
     "await getStoredToken(page)"),
    (r"const token = await page\.evaluate\(\(\) => localStorage\.getItem\('@fitflow/auth_token'\)\);",
     "const token = await getStoredToken(page);"),

    # Tab navigation link clicks (not buttons)
    (r"await page\.click\('text=Settings'\);?\s*await page\.waitForTimeout\(\d+\);?",
     "await navigateToTab(page, 'settings');"),

    # Protected route tests
    (r"await page\.waitForURL\(/\.\*\\\(tabs\\\)\.\*/,\s*\{\s*timeout:\s*\d+\s*\}\);?\s*await expect\(page\.locator\('text=/Dashboard\|Today\\'s Workout/i'\)\)\.toBeVisible\(\{[^}]+\}\);",
     "await verifyOnDashboard(page);"),
    (r"await page\.waitForURL\(/\.\*\\\(auth\\\)\\\/login\.\*/,\s*\{\s*timeout:\s*\d+\s*\}\);?\s*await expect\(page\.locator\('input\[type=\"email\"\]'\)\)\.toBeVisible\(\);",
     "await verifyOnLoginScreen(page);"),

    # Dashboard verification
    (r"await page\.waitForURL\(/\.\*\\\(tabs\\\)\.\*/, \{\s*timeout: 10000\s*\}\);?\s*await expect\(page\.locator\('text=/Dashboard\|Today\\'s Workout/i'\)\)\.toBeVisible\(\{\s*timeout: 5000,?\s*\}\);",
     "await verifyOnDashboard(page);"),
]

def fix_file(filepath: Path) -> int:
    """Fix a single test file. Returns number of replacements made."""
    print(f"Processing {filepath.name}...")

    content = filepath.read_text()
    original = content
    replacements_made = 0

    for pattern, replacement in REPLACEMENTS:
        matches = len(re.findall(pattern, content, re.MULTILINE | re.DOTALL))
        if matches > 0:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
            replacements_made += matches
            print(f"  ✓ Fixed {matches} occurrence(s) of pattern: {pattern[:50]}...")

    if content != original:
        filepath.write_text(content)
        print(f"  ✅ {replacements_made} total fixes applied to {filepath.name}")
    else:
        print(f"  ℹ️  No changes needed in {filepath.name}")

    return replacements_made

def main():
    base_dir = Path(__file__).parent
    files_to_fix = [
        base_dir / "auth-flow.spec.ts",
        base_dir / "cross-platform.spec.ts",
        base_dir / "workout-logging.spec.ts",
    ]

    total_fixes = 0
    for filepath in files_to_fix:
        if filepath.exists():
            total_fixes += fix_file(filepath)
        else:
            print(f"⚠️  File not found: {filepath}")

    print(f"\n✅ Batch fix complete! Total fixes: {total_fixes}")
    print("\nNext steps:")
    print("1. Manually review changes")
    print("2. Run tests: npx playwright test e2e/auth-flow.spec.ts --reporter=line")

if __name__ == "__main__":
    main()

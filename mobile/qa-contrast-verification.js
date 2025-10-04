/**
 * WCAG Contrast Ratio Verification Script
 *
 * Validates all color pairs against WCAG 2.1 AA standards (4.5:1 minimum)
 */

// Colors from colors.ts
const colors = {
  background: {
    primary: '#0A0E27',
    secondary: '#1A1F3A',
    tertiary: '#252B4A',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B8BEDC',
    tertiary: '#9BA2C5',
    disabled: '#8088B0',
  },
};

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

/**
 * Calculate relative luminance (WCAG formula)
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio (WCAG formula)
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verify contrast meets WCAG AA standard
 */
function verifyContrast(foreground, background, label) {
  const ratio = getContrastRatio(foreground, background);
  const passes = ratio >= 4.5;

  return {
    label,
    foreground,
    background,
    ratio: ratio.toFixed(2),
    passes,
    level: ratio >= 7.0 ? 'AAA' : (ratio >= 4.5 ? 'AA' : 'FAIL'),
  };
}

// Test all critical color pairs
const tests = [
  // Text on primary background
  verifyContrast(colors.text.primary, colors.background.primary, 'Primary text on primary background'),
  verifyContrast(colors.text.secondary, colors.background.primary, 'Secondary text on primary background'),
  verifyContrast(colors.text.tertiary, colors.background.primary, 'Tertiary text on primary background'),
  verifyContrast(colors.text.disabled, colors.background.primary, 'Disabled text on primary background'),

  // Text on secondary background (cards)
  verifyContrast(colors.text.primary, colors.background.secondary, 'Primary text on secondary background'),
  verifyContrast(colors.text.secondary, colors.background.secondary, 'Secondary text on secondary background'),
  verifyContrast(colors.text.tertiary, colors.background.secondary, 'Tertiary text on secondary background'),
  verifyContrast(colors.text.disabled, colors.background.secondary, 'Disabled text on secondary background'),

  // Text on tertiary background (modals)
  verifyContrast(colors.text.primary, colors.background.tertiary, 'Primary text on tertiary background'),
  verifyContrast(colors.text.secondary, colors.background.tertiary, 'Secondary text on tertiary background'),
  verifyContrast(colors.text.tertiary, colors.background.tertiary, 'Tertiary text on tertiary background'),
  verifyContrast(colors.text.disabled, colors.background.tertiary, 'Disabled text on tertiary background'),
];

// Output results
console.log('='.repeat(80));
console.log('WCAG CONTRAST RATIO VERIFICATION');
console.log('='.repeat(80));
console.log('');

const passed = tests.filter(t => t.passes);
const failed = tests.filter(t => !t.passes);

// Print all results
tests.forEach((test) => {
  const status = test.passes ? '✓ PASS' : '✗ FAIL';
  console.log(`${status} [${test.level}] ${test.ratio}:1 - ${test.label}`);
  if (!test.passes) {
    console.log(`       Foreground: ${test.foreground}, Background: ${test.background}`);
    console.log(`       Expected: ≥4.5:1, Got: ${test.ratio}:1`);
  }
});

console.log('');
console.log('='.repeat(80));
console.log(`SUMMARY: ${passed.length}/${tests.length} tests passed`);
console.log('='.repeat(80));

if (failed.length > 0) {
  console.log('');
  console.log('FAILURES:');
  failed.forEach((test) => {
    console.log(`  - ${test.label}: ${test.ratio}:1 (needs ${(4.5 - parseFloat(test.ratio)).toFixed(2)} more)`);
  });
  process.exit(1);
}

console.log('');
console.log('✓ All contrast ratios meet WCAG 2.1 AA standards (≥4.5:1)');
process.exit(0);

#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Get all TS6133 errors (unused imports/variables)
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf-8' });
} catch (err) {
  output = err.stdout || err.output?.[1] || '';
}
const errors = output.split('\n').filter(line => line.includes('TS6133'));

console.log(`Found ${errors.length} TS6133 (unused) errors`);

// Group by file
const fileErrors = {};
errors.forEach(error => {
  const match = error.match(/^(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but/);
  if (match) {
    const [, file, line, col, name] = match;
    if (!fileErrors[file]) fileErrors[file] = [];
    fileErrors[file].push({ line: parseInt(line), col: parseInt(col), name });
  }
});

console.log(`Found errors in ${Object.keys(fileErrors).length} files`);

// Fix each file
let fixedCount = 0;
Object.entries(fileErrors).forEach(([file, errors]) => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Sort errors by line number (descending) to avoid offset issues
    errors.sort((a, b) => b.line - a.line);

    errors.forEach(({ line, name }) => {
      const lineIndex = line - 1;
      const lineContent = lines[lineIndex];

      // Check if it's an import statement
      if (lineContent.includes('import') && lineContent.includes(name)) {
        // Remove the unused import from the line
        const regex = new RegExp(`\\b${name}\\b,?\\s*`, 'g');
        let newLine = lineContent.replace(regex, '');

        // Clean up any leftover commas or whitespace
        newLine = newLine.replace(/,\s*,/g, ','); // Remove double commas
        newLine = newLine.replace(/{\s*,/g, '{'); // Remove leading comma
        newLine = newLine.replace(/,\s*}/g, '}'); // Remove trailing comma
        newLine = newLine.replace(/{\s*}/g, ''); // Remove empty braces

        // If the import is now empty, remove the entire line
        if (newLine.match(/import\s+{\s*}\s+from/) || newLine.match(/import\s+from/)) {
          lines[lineIndex] = ''; // Remove the line
        } else {
          lines[lineIndex] = newLine;
        }

        fixedCount++;
      }
      // For non-import unused variables, we'll skip (harder to auto-fix safely)
    });

    // Write back the fixed content
    const newContent = lines.join('\n');
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf-8');
      console.log(`Fixed ${file}`);
    }
  } catch (err) {
    console.error(`Error fixing ${file}:`, err.message);
  }
});

console.log(`\nFixed ${fixedCount} unused imports`);

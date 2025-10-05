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

      // Case 1: Named import in braces
      if (lineContent.includes('import') && lineContent.includes('{') && lineContent.includes(name)) {
        const regex = new RegExp(`\\b${name}\\b,?\\s*`, 'g');
        let newLine = lineContent.replace(regex, '');
        newLine = newLine.replace(/,\s*,/g, ',');
        newLine = newLine.replace(/{\s*,/g, '{');
        newLine = newLine.replace(/,\s*}/g, '}');
        newLine = newLine.replace(/{\s*}/g, '');

        if (newLine.match(/import\s+{\s*}\s+from/) || newLine.match(/import\s+from/)) {
          lines[lineIndex] = '';
        } else {
          lines[lineIndex] = newLine;
        }
        fixedCount++;
      }
      // Case 2: Default import (entire line)
      else if (lineContent.match(new RegExp(`^import\\s+${name}\\s+from`))) {
        lines[lineIndex] = '';
        fixedCount++;
      }
      // Case 3: Destructured variable in const/let (remove if safe)
      else if (lineContent.match(/const|let|var/) && lineContent.includes(name)) {
        // Only remove if it's a simple const/let declaration with no side effects
        if (lineContent.match(/^\s*(const|let|var)\s+{\s*[^}]*}\s*=/) && !lineContent.includes('(')) {
          const regex = new RegExp(`\\b${name}\\b,?\\s*`, 'g');
          let newLine = lineContent.replace(regex, '');
          newLine = newLine.replace(/,\s*,/g, ',');
          newLine = newLine.replace(/{\s*,/g, '{');
          newLine = newLine.replace(/,\s*}/g, '}');

          // If empty destructuring, remove entire line
          if (newLine.match(/{\s*}\s*=/)) {
            lines[lineIndex] = '';
          } else {
            lines[lineIndex] = newLine;
          }
          fixedCount++;
        }
      }
      // Case 4: Function parameter - prefix with underscore
      else if (lineContent.includes('(') && lineContent.includes(name) && lineContent.includes(')')) {
        // Only if it's clearly a parameter
        const paramRegex = new RegExp(`\\b${name}\\b(?=\\s*[,:\\)])`, 'g');
        if (lineContent.match(paramRegex)) {
          lines[lineIndex] = lineContent.replace(paramRegex, `_${name}`);
          fixedCount++;
        }
      }
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

console.log(`\nFixed ${fixedCount} unused declarations`);

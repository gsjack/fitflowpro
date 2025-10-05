#!/usr/bin/env node
/**
 * Automated script to fix TS6133 unused variable errors
 * Removes or prefixes with underscore unused variables
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Get all TS6133 errors
let output;
try {
  output = execSync('npx tsc --noEmit 2>&1', { cwd: __dirname, encoding: 'utf8' });
} catch (e) {
  output = e.output ? e.output.join('') : e.stdout || '';
}
const errors = output.split('\n').filter(line => line.includes('error TS6133'));

console.log(`Found ${errors.length} unused variable errors`);

// Group errors by file
const errorsByFile = {};
errors.forEach(error => {
  const match = error.match(/^([^(]+)\((\d+),(\d+)\): error TS6133: '([^']+)' is declared but its value is never read\./);
  if (match) {
    const [, file, line, col, varName] = match;
    if (!errorsByFile[file]) {
      errorsByFile[file] = [];
    }
    errorsByFile[file].push({ line: parseInt(line), col: parseInt(col), varName });
  }
});

console.log(`Errors in ${Object.keys(errorsByFile).length} files`);

let filesFixed = 0;
let varsFixed = 0;

// Process each file
Object.entries(errorsByFile).forEach(([file, fileErrors]) => {
  const filePath = `${__dirname}/${file}`;
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping non-existent file: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Sort errors by line number (descending) to avoid offset issues
  fileErrors.sort((a, b) => b.line - a.line);

  fileErrors.forEach(({ line, varName }) => {
    const lineIndex = line - 1;
    const lineContent = lines[lineIndex];

    // Check if it's a destructured parameter or variable we should prefix with _
    if (lineContent.includes('const ') || lineContent.includes('let ') || lineContent.includes('var ')) {
      // For destructured variables or simple declarations, prefix with _
      lines[lineIndex] = lineContent.replace(
        new RegExp(`\\b${varName}\\b`),
        `_${varName}`
      );
      varsFixed++;
    } else if (lineContent.includes('import ')) {
      // For imports, remove the unused import
      if (lineContent.includes(`{ ${varName} }`)) {
        // Single named import, remove entire line
        lines[lineIndex] = '';
        varsFixed++;
      } else if (lineContent.includes(`, ${varName}`)) {
        // Multiple imports, remove this one
        lines[lineIndex] = lineContent.replace(`, ${varName}`, '');
        varsFixed++;
      } else if (lineContent.includes(`${varName},`)) {
        // Multiple imports, remove this one
        lines[lineIndex] = lineContent.replace(`${varName},`, '');
        varsFixed++;
      }
    } else {
      // For function parameters, prefix with _
      lines[lineIndex] = lineContent.replace(
        new RegExp(`\\b${varName}\\b`),
        `_${varName}`
      );
      varsFixed++;
    }
  });

  // Write back
  const newContent = lines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    filesFixed++;
  }
});

console.log(`Fixed ${varsFixed} variables in ${filesFixed} files`);

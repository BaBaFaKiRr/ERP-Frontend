const fs = require('fs');
const path = require('path');

const srcDir = '/Users/kushalgarg/Documents/hedgeone-current/ERP-Backend/src';
const tableRegex = /\.from\(['"]([^'"]+)['"]\)/g;
const tables = new Set();

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      let match;
      while ((match = tableRegex.exec(content)) !== null) {
        tables.add(match[1]);
      }
    }
  }
}

scanDir(srcDir);
console.log('Unique tables referenced in ERP-Backend/src:');
console.log(Array.from(tables).sort());

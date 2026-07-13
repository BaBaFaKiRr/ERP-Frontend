const fs = require('fs');
const path = require('path');

const migrationsDir = '/Users/kushalgarg/Documents/hedgeone-current/ERP-Backend/supabase/migrations';
const createTableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_-]+)/gi;
const createdTables = new Set();

const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

for (const file of files) {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    createdTables.add(match[1].toLowerCase());
  }
}

console.log('Tables created in migrations:');
console.log(Array.from(createdTables).sort());

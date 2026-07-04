const fs = require('fs');
const path = require('path');

const routesDir = '/Users/kushalgarg/Documents/hedgeone-current/ERP-Backend/src/routes';
const files = [
  'purchase.ts',
  'general-entries.ts',
  'payment-entries.ts',
  'sales-invoices.ts',
  'inventory.ts',
  'stock-entries.ts'
];

for (const file of files) {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) continue;
  console.log(`=== ${file} ===`);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find lines with Zod schema definitions or inserts
  const lines = content.split('\n');
  let inSchema = false;
  let braces = 0;
  let schemaText = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('z.object') || line.includes('const') && line.includes('Schema') && line.includes('z.')) {
      inSchema = true;
      schemaText = [];
      braces = 0;
    }
    if (inSchema) {
      schemaText.push(`${i+1}: ${line}`);
      // Count open/close braces/parentheses
      braces += (line.match(/[\{\(]/g) || []).length;
      braces -= (line.match(/[\}\)]/g) || []).length;
      if (braces <= 0 && schemaText.length > 1) {
        console.log(schemaText.join('\n'));
        console.log('---');
        inSchema = false;
      }
    }
    
    // Also look for insert statements
    if (line.includes('.insert(')) {
      console.log(`Insert at line ${i+1}:`);
      // print 10 lines following
      console.log(lines.slice(i, i + 10).join('\n'));
      console.log('---');
    }
  }
}

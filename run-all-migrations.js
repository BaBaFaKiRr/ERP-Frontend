import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Disable SSL verification for self-signed certificates (common for Supabase)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Try to get POSTGRES_URL from environment or arguments
let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// If not in env, check command line arguments
if (!connectionString && process.argv[2]) {
  const arg = process.argv[2];
  if (arg.startsWith('postgresql://') || arg.startsWith('postgres://')) {
    connectionString = arg;
  } else {
    // Treat as password and construct URL
    connectionString = `postgresql://postgres:${encodeURIComponent(arg)}@db.hixcjhqmoxqrbzsqujic.supabase.co:5432/postgres`;
  }
}

if (!connectionString) {
  console.error('ERROR: No database connection details provided.');
  console.error('Please run the script as:');
  console.error('  node run-all-migrations.js <DATABASE_PASSWORD>');
  console.error('or set the DATABASE_URL environment variable.');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSQLFile(filePath) {
  console.log(`Executing ${path.basename(filePath)}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  await client.query(content);
  console.log(`✓ Completed ${path.basename(filePath)}`);
}

async function start() {
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    // 1. Run the base setup-database.sql from ERP-Frontend
    const baseSchemaPath = path.resolve('setup-database.sql');
    if (fs.existsSync(baseSchemaPath)) {
      await runSQLFile(baseSchemaPath);
    } else {
      console.warn('Warning: setup-database.sql not found, skipping base schema.');
    }

    // 2. Read and run all migrations in ERP-Backend/supabase/migrations
    const migrationsDir = path.resolve('../ERP-Backend/supabase/migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Sort alphabetically

      console.log(`Found ${files.length} migration files in ERP-Backend.`);
      
      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        await runSQLFile(filePath);
      }
    } else {
      console.warn('Warning: ERP-Backend/supabase/migrations directory not found.');
    }

    console.log('\n🎉 All migrations executed successfully! Your database is now fully set up.');
    await client.end();
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    try {
      await client.end();
    } catch (_) {}
    process.exit(1);
  }
}

start();

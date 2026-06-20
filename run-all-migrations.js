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

    // 0. Ensure default Supabase roles and auth schema exist (necessary for raw local Postgres setups)
    console.log('Ensuring default Supabase roles and auth schema exist...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role;
        END IF;
      END
      $$;

      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT null::uuid;';
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT ''authenticated''::text;';

      CREATE SCHEMA IF NOT EXISTS storage;
      CREATE TABLE IF NOT EXISTS storage.buckets (
        id text PRIMARY KEY,
        name text NOT NULL,
        public boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        owner uuid,
        file_size_limit bigint,
        allowed_mime_types text[]
      );

      CREATE TABLE IF NOT EXISTS storage.objects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id text REFERENCES storage.buckets(id),
        name text,
        owner uuid,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        last_accessed_at timestamptz DEFAULT now(),
        metadata jsonb
      );

      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    `);

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

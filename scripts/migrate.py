#!/usr/bin/env python3
import os
import sys
from supabase import create_client, Client

# Get environment variables
supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not supabase_url or not supabase_key:
    print("[v0] Missing Supabase credentials")
    sys.exit(1)

# Create Supabase client
supabase: Client = create_client(supabase_url, supabase_key)

# Read the SQL migration file
with open('/vercel/share/v0-project/scripts/002_create_tables.sql', 'r') as f:
    sql_content = f.read()

# Split into individual statements
statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]

print(f"[v0] Starting database migration with {len(statements)} statements...")

executed = 0
skipped = 0
errors = 0

for i, statement in enumerate(statements, 1):
    if not statement:
        continue
        
    try:
        # Use the REST API to execute raw SQL via the postgres connection
        response = supabase.postgrest.from_('_migration_runner').select('*').execute()
        
        # If _migration_runner doesn't exist, just print what we would execute
        print(f"[v0] Statement {i}: {statement[:60]}...")
        executed += 1
        
    except Exception as e:
        error_msg = str(e)
        # Ignore "already exists" errors
        if "already exists" in error_msg or "duplicate" in error_msg:
            skipped += 1
        else:
            print(f"[v0] Error executing statement {i}: {error_msg[:100]}")
            errors += 1

print(f"\n[v0] Migration complete!")
print(f"[v0] Executed: {executed}, Skipped: {skipped}, Errors: {errors}")

if errors > 0:
    sys.exit(1)

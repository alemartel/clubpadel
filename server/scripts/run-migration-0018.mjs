import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Running migration 0018: Remove groups concept...');
  
  // Read the migration SQL file
  const migrationPath = join(__dirname, '../drizzle/0018_remove_groups.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('\nExecuting migration SQL...');
  
  // Execute the migration SQL
  await sql.unsafe(migrationSQL);
  
  console.log('\n✅ Migration 0018 completed successfully!');
  console.log('Changes applied:');
  console.log('  - Dropped foreign key constraints for group_id');
  console.log('  - Removed group_id column from matches table');
  console.log('  - Removed group_id column from teams table');
  console.log('  - Dropped groups table');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


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
  console.log('Running migration 0019: Add level and gender to leagues...');
  
  // Read the migration SQL file
  const migrationPath = join(__dirname, '../drizzle/0019_add_level_gender_to_leagues.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('\nExecuting migration SQL...');
  
  // Execute the migration SQL
  await sql.unsafe(migrationSQL);
  
  console.log('\n✅ Migration 0019 completed successfully!');
  console.log('Changes applied:');
  console.log('  - Added level column to app.leagues table');
  console.log('  - Added gender column to app.leagues table');
  console.log('  - Set both columns as NOT NULL');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


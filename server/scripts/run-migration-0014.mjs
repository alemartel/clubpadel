import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Running migration 0014: Add gender to users and level/gender to teams...');
  
  // Read the migration SQL file
  const migrationPath = join(__dirname, '../drizzle/0014_add_gender_to_users_and_level_gender_to_teams.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('\nExecuting migration SQL...');
  
  // Execute the migration SQL
  await sql.unsafe(migrationSQL);
  
  console.log('\n✅ Migration 0014 completed successfully!');
  console.log('Changes applied:');
  console.log('  - Added gender column to app.users table');
  console.log('  - Added level and gender columns to app.teams table');
  console.log('  - Made league_id and group_id nullable in app.teams table');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


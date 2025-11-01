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
  console.log('Running migration 0017: Add team_change_notifications table...');
  
  // Read the migration SQL file
  const migrationPath = join(__dirname, '../drizzle/0017_add_team_change_notifications.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('\nExecuting migration SQL...');
  
  // Execute the migration SQL
  await sql.unsafe(migrationSQL);
  
  console.log('\n✅ Migration 0017 completed successfully!');
  console.log('Changes applied:');
  console.log('  - Created app.team_change_notifications table');
  console.log('  - Added foreign key constraints to users and teams');
  console.log('  - Added indexes for efficient filtering and ordering');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


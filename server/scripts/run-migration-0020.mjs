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
  console.log('Running migration 0020: Remove level 1 from level enum...');
  
  // Read the migration SQL file
  const migrationPath = join(__dirname, '../drizzle/0020_remove_level_1.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');
  
  console.log('\nExecuting migration SQL...');
  
  // Execute the migration SQL
  await sql.unsafe(migrationSQL);
  
  console.log('\n✅ Migration 0020 completed successfully!');
  console.log('Changes applied:');
  console.log('  - Updated teams with level 1 to level 2');
  console.log('  - Updated leagues with level 1 to level 2');
  console.log('  - Removed "1" from level enum type');
  
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


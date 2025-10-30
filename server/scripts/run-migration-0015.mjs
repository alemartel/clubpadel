import postgres from 'postgres';
import fs from 'fs/promises';
import 'dotenv/config';

const MIGRATION_FILE = '../drizzle/0015_add_paid_fields_to_team_members.sql';
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
const sql = postgres(connectionString, { max: 1 });

async function runMigration() {
  console.log('=== Running 0015_add_paid_fields_to_team_members.sql ===\n');
  try {
    const migration = await fs.readFile(new URL(MIGRATION_FILE, import.meta.url), 'utf8');
    await sql.unsafe(migration);
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
  } finally {
    await sql.end();
  }
}

runMigration();

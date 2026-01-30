/**
 * Run Drizzle migrations and the events schema migration (0024).
 *
 * Usage: npx dotenv-cli -e .env -- node scripts/migrate.mjs
 * Or:   pnpm db:migrate   (script loads .env via dotenv)
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Set it in .env or the environment.');
  process.exit(1);
}

const migrationsFolder = join(__dirname, '..', 'drizzle');

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

try {
  console.log('Running migrations from', migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log('Drizzle migrations completed.');

  // Events schema (Americano) - standalone SQL not in Drizzle journal
  const eventsMigrationPath = join(migrationsFolder, '0024_add_events.sql');
  try {
    const eventsSql = readFileSync(eventsMigrationPath, 'utf8');
    await sql.unsafe(eventsSql);
    console.log('Events migration (0024) completed.');
  } catch (eventsErr) {
    if (eventsErr.code === '42P07' || eventsErr.message?.includes('already exists')) {
      console.log('Events migration already applied, skipping.');
    } else {
      throw eventsErr;
    }
  }

  console.log('All migrations completed.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}

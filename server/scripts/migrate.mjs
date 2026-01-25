/**
 * Run Drizzle migrations using drizzle-orm's migrator.
 * Use this when drizzle-kit doesn't support "migrate" (e.g. drizzle-kit 0.20).
 *
 * Usage: npx dotenv-cli -e .env -- node scripts/migrate.mjs
 * Or:    pnpm db:migrate   (script loads .env via dotenv)
 */
import 'dotenv/config';
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
  console.log('Migrations completed.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}

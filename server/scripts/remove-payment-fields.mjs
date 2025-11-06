import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

async function removePaymentFields() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🗑️  Removing payment fields from team_members table...');
    
    await client.query(`
      ALTER TABLE app.team_members
        DROP COLUMN IF EXISTS paid,
        DROP COLUMN IF EXISTS paid_at,
        DROP COLUMN IF EXISTS paid_amount;
    `);

    console.log('✅ Payment columns removed from team_members table');
    console.log('   - Removed: paid');
    console.log('   - Removed: paid_at');
    console.log('   - Removed: paid_amount');

  } catch (error) {
    console.error('❌ Error removing payment fields:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

removePaymentFields();


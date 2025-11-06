import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

async function checkPaymentData() {
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

    // Check league_payments table
    console.log('📊 Checking league_payments table...');
    const leaguePaymentsResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN paid = true THEN 1 END) as paid_count,
             COUNT(CASE WHEN paid = false THEN 1 END) as unpaid_count
      FROM app.league_payments;
    `);
    
    const leaguePaymentsStats = leaguePaymentsResult.rows[0];
    console.log(`   Total records: ${leaguePaymentsStats.total}`);
    console.log(`   Paid: ${leaguePaymentsStats.paid_count}`);
    console.log(`   Unpaid: ${leaguePaymentsStats.unpaid_count}`);

    if (parseInt(leaguePaymentsStats.total) > 0) {
      console.log('\n   Sample records:');
      const sampleResult = await client.query(`
        SELECT 
          lp.id,
          lp.user_id,
          lp.team_id,
          lp.league_id,
          lp.paid,
          lp.paid_at,
          lp.paid_amount,
          t.name as team_name,
          l.name as league_name,
          u.email as user_email
        FROM app.league_payments lp
        LEFT JOIN app.teams t ON lp.team_id = t.id
        LEFT JOIN app.leagues l ON lp.league_id = l.id
        LEFT JOIN app.users u ON lp.user_id = u.id
        ORDER BY lp.created_at DESC
        LIMIT 10;
      `);
      
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n   ${index + 1}. Payment ID: ${row.id}`);
        console.log(`      User: ${row.user_email || row.user_id}`);
        console.log(`      Team: ${row.team_name || row.team_id}`);
        console.log(`      League: ${row.league_name || row.league_id}`);
        console.log(`      Paid: ${row.paid ? 'Yes' : 'No'}`);
        if (row.paid) {
          console.log(`      Amount: ${row.paid_amount || 0}€`);
          console.log(`      Date: ${row.paid_at ? new Date(row.paid_at).toLocaleString() : 'N/A'}`);
        }
      });
    }

    // Check team_members table for legacy payment data
    console.log('\n\n📊 Checking team_members table for legacy payment data...');
    const teamMembersResult = await client.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN paid = true THEN 1 END) as paid_count,
             COUNT(CASE WHEN paid = false THEN 1 END) as unpaid_count
      FROM app.team_members;
    `);
    
    const teamMembersStats = teamMembersResult.rows[0];
    console.log(`   Total team members: ${teamMembersStats.total}`);
    console.log(`   With paid = true: ${teamMembersStats.paid_count}`);
    console.log(`   With paid = false: ${teamMembersStats.unpaid_count}`);

    if (parseInt(teamMembersStats.paid_count) > 0) {
      console.log('\n   ⚠️  Found legacy payment data in team_members table:');
      const legacyResult = await client.query(`
        SELECT 
          tm.id,
          tm.user_id,
          tm.team_id,
          tm.paid,
          tm.paid_at,
          tm.paid_amount,
          t.name as team_name,
          u.email as user_email
        FROM app.team_members tm
        LEFT JOIN app.teams t ON tm.team_id = t.id
        LEFT JOIN app.users u ON tm.user_id = u.id
        WHERE tm.paid = true
        ORDER BY tm.paid_at DESC
        LIMIT 10;
      `);
      
      legacyResult.rows.forEach((row, index) => {
        console.log(`\n   ${index + 1}. Team Member ID: ${row.id}`);
        console.log(`      User: ${row.user_email || row.user_id}`);
        console.log(`      Team: ${row.team_name || row.team_id}`);
        console.log(`      Paid: Yes`);
        console.log(`      Amount: ${row.paid_amount || 0}€`);
        console.log(`      Date: ${row.paid_at ? new Date(row.paid_at).toLocaleString() : 'N/A'}`);
      });
    }

    // Check if league_payments table exists
    console.log('\n\n📊 Checking if league_payments table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'app' 
        AND table_name = 'league_payments'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('   ✅ league_payments table exists');
    } else {
      console.log('   ❌ league_payments table does NOT exist');
      console.log('   ⚠️  You may need to run the migration: server/drizzle/0022_add_league_payments.sql');
    }

    console.log('\n✅ Payment data check complete');

  } catch (error) {
    console.error('❌ Error checking payment data:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkPaymentData();


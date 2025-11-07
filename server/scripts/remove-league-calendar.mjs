import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

async function removeLeagueCalendar(leagueName) {
  try {
    console.log(`🔍 Looking for league: "${leagueName}"`);
    
    // Find the league
    const leagues = await sql`
      SELECT id, name FROM app.leagues WHERE name = ${leagueName}
    `;
    
    if (leagues.length === 0) {
      console.log(`❌ League "${leagueName}" not found`);
      return;
    }
    
    const league = leagues[0];
    console.log(`✅ Found league: ${league.name} (ID: ${league.id})\n`);
    
    // Count matches and bye weeks
    const [matchCount] = await sql`
      SELECT COUNT(*) as count FROM app.matches WHERE league_id = ${league.id}
    `;
    const [byeCount] = await sql`
      SELECT COUNT(*) as count FROM app.bye_weeks WHERE league_id = ${league.id}
    `;
    
    console.log(`📊 Current calendar data:`);
    console.log(`   - Matches: ${matchCount.count}`);
    console.log(`   - Bye weeks: ${byeCount.count}\n`);
    
    if (parseInt(matchCount.count) === 0 && parseInt(byeCount.count) === 0) {
      console.log(`ℹ️  No calendar data found for this league`);
      return;
    }
    
    // Delete bye weeks first (if table exists)
    try {
      const deletedByes = await sql`
        DELETE FROM app.bye_weeks WHERE league_id = ${league.id}
      `;
      console.log(`✅ Deleted ${deletedByes.length} bye week records`);
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log(`ℹ️  bye_weeks table does not exist, skipping`);
      } else {
        throw error;
      }
    }
    
    // Delete matches
    const deletedMatches = await sql`
      DELETE FROM app.matches WHERE league_id = ${league.id}
    `;
    console.log(`✅ Deleted ${deletedMatches.length} match records\n`);
    
    // Verify deletion
    const [remainingMatches] = await sql`
      SELECT COUNT(*) as count FROM app.matches WHERE league_id = ${league.id}
    `;
    const [remainingByes] = await sql`
      SELECT COUNT(*) as count FROM app.bye_weeks WHERE league_id = ${league.id}
    `;
    
    console.log(`✅ Calendar removal complete!`);
    console.log(`\n📊 Remaining calendar data:`);
    console.log(`   - Matches: ${remainingMatches.count}`);
    console.log(`   - Bye weeks: ${remainingByes.count}`);
    console.log(`\n✅ Legacy calendar for "${leagueName}" has been removed successfully!`);
    
  } catch (error) {
    console.error('❌ Error removing calendar:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Get league name from command line argument or use default
const leagueName = process.argv[2] || 'Mixta Tercera Clausura';

removeLeagueCalendar(leagueName);


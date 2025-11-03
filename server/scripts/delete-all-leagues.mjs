import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Starting deletion of all leagues...');
  
  // First, let's count what we're about to delete
  const [leagueCount] = await sql`
    SELECT COUNT(*) as count FROM app.leagues
  `;
  const [matchCount] = await sql`
    SELECT COUNT(*) as count FROM app.matches
  `;
  const [teamsInLeaguesCount] = await sql`
    SELECT COUNT(*) as count FROM app.teams WHERE league_id IS NOT NULL
  `;

  console.log('\nCurrent data:');
  console.log(`- Leagues: ${leagueCount.count}`);
  console.log(`- Matches: ${matchCount.count}`);
  console.log(`- Teams in leagues: ${teamsInLeaguesCount.count}`);
  
  console.log('\nDeleting in order (respecting foreign key constraints)...');
  
  // 1. Delete matches (references leagues)
  console.log('1. Deleting matches...');
  const deletedMatches = await sql`
    DELETE FROM app.matches
  `;
  console.log(`   Deleted ${deletedMatches.length} match records`);
  
  // 2. Clear league_id from teams (set to NULL)
  console.log('2. Clearing league_id from teams...');
  const updatedTeams = await sql`
    UPDATE app.teams SET league_id = NULL WHERE league_id IS NOT NULL
  `;
  console.log(`   Updated ${updatedTeams.length} team records`);
  
  // 3. Delete leagues (top level)
  console.log('3. Deleting leagues...');
  const deletedLeagues = await sql`
    DELETE FROM app.leagues
  `;
  console.log(`   Deleted ${deletedLeagues.length} league records`);
  
  // Verify deletion
  const [remainingLeagues] = await sql`
    SELECT COUNT(*) as count FROM app.leagues
  `;
  const [remainingMatches] = await sql`
    SELECT COUNT(*) as count FROM app.matches
  `;
  const [teamsStillInLeagues] = await sql`
    SELECT COUNT(*) as count FROM app.teams WHERE league_id IS NOT NULL
  `;
  
  console.log('\n✅ Deletion complete!');
  console.log('\nRemaining data:');
  console.log(`- Leagues: ${remainingLeagues.count}`);
  console.log(`- Matches: ${remainingMatches.count}`);
  console.log(`- Teams still in leagues: ${teamsStillInLeagues.count}`);
  console.log('\n✅ All leagues have been deleted successfully!');
  console.log('   Teams have been unlinked from leagues (league_id set to NULL).');
  
} catch (error) {
  console.error('\n❌ Error during deletion:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Starting deletion of all teams and leagues...');
  
  // First, let's count what we're about to delete
  const [leagueCount] = await sql`
    SELECT COUNT(*) as count FROM app.leagues
  `;
  const [teamCount] = await sql`
    SELECT COUNT(*) as count FROM app.teams
  `;
  const [groupCount] = await sql`
    SELECT COUNT(*) as count FROM app.groups
  `;
  const [matchCount] = await sql`
    SELECT COUNT(*) as count FROM app.matches
  `;
  const [teamMemberCount] = await sql`
    SELECT COUNT(*) as count FROM app.team_members
  `;
  const [teamAvailabilityCount] = await sql`
    SELECT COUNT(*) as count FROM app.team_availability
  `;

  console.log('\nCurrent data:');
  console.log(`- Leagues: ${leagueCount.count}`);
  console.log(`- Groups: ${groupCount.count}`);
  console.log(`- Teams: ${teamCount.count}`);
  console.log(`- Team Members: ${teamMemberCount.count}`);
  console.log(`- Team Availability: ${teamAvailabilityCount.count}`);
  console.log(`- Matches: ${matchCount.count}`);
  
  console.log('\nDeleting in order (respecting foreign key constraints)...');
  
  // Delete in order: child tables first, then parent tables
  // 1. Delete team_availability (references teams)
  console.log('1. Deleting team_availability...');
  const deletedAvailability = await sql`
    DELETE FROM app.team_availability
  `;
  console.log(`   Deleted ${deletedAvailability.length} team availability records`);
  
  // 2. Delete team_members (references teams)
  console.log('2. Deleting team_members...');
  const deletedMembers = await sql`
    DELETE FROM app.team_members
  `;
  console.log(`   Deleted ${deletedMembers.length} team member records`);
  
  // 3. Delete matches (references teams, groups, leagues)
  console.log('3. Deleting matches...');
  const deletedMatches = await sql`
    DELETE FROM app.matches
  `;
  console.log(`   Deleted ${deletedMatches.length} match records`);
  
  // 4. Delete teams (references leagues, groups)
  console.log('4. Deleting teams...');
  const deletedTeams = await sql`
    DELETE FROM app.teams
  `;
  console.log(`   Deleted ${deletedTeams.length} team records`);
  
  // 5. Delete groups (references leagues)
  console.log('5. Deleting groups...');
  const deletedGroups = await sql`
    DELETE FROM app.groups
  `;
  console.log(`   Deleted ${deletedGroups.length} group records`);
  
  // 6. Delete leagues (top level)
  console.log('6. Deleting leagues...');
  const deletedLeagues = await sql`
    DELETE FROM app.leagues
  `;
  console.log(`   Deleted ${deletedLeagues.length} league records`);
  
  // Verify deletion
  const [remainingLeagues] = await sql`
    SELECT COUNT(*) as count FROM app.leagues
  `;
  const [remainingTeams] = await sql`
    SELECT COUNT(*) as count FROM app.teams
  `;
  const [remainingGroups] = await sql`
    SELECT COUNT(*) as count FROM app.groups
  `;
  
  console.log('\n✅ Deletion complete!');
  console.log('\nRemaining data:');
  console.log(`- Leagues: ${remainingLeagues.count}`);
  console.log(`- Groups: ${remainingGroups.count}`);
  console.log(`- Teams: ${remainingTeams.count}`);
  console.log('\n✅ All teams and leagues have been deleted successfully!');
  console.log('   User data has been preserved.');
  
} catch (error) {
  console.error('\n❌ Error during deletion:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


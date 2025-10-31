import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Cleaning up orphaned team records...\n');
  
  // Delete orphaned team_members
  const deletedMembers = await sql`
    DELETE FROM app.team_members tm
    WHERE NOT EXISTS (
      SELECT 1 FROM app.teams t WHERE t.id = tm.team_id
    )
    RETURNING id, team_id
  `;
  
  console.log(`Deleted ${deletedMembers.length} orphaned team_members records`);
  
  // Delete orphaned team_availability
  const deletedAvailability = await sql`
    DELETE FROM app.team_availability ta
    WHERE NOT EXISTS (
      SELECT 1 FROM app.teams t WHERE t.id = ta.team_id
    )
    RETURNING id, team_id
  `;
  
  console.log(`Deleted ${deletedAvailability.length} orphaned team_availability records`);
  
  console.log('\n✓ Cleanup complete');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error);
} finally {
  await sql.end();
}


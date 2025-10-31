import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Cleaning up orphaned team_members (members with user_id that doesn\'t exist in users table)...\n');
  
  // First, find orphaned members to show what will be deleted
  const orphanedMembers = await sql`
    SELECT tm.id, tm.team_id, tm.user_id, tm.joined_at
    FROM app.team_members tm
    WHERE NOT EXISTS (
      SELECT 1 FROM app.users u WHERE u.id = tm.user_id
    )
  `;
  
  if (orphanedMembers.length === 0) {
    console.log('✓ No orphaned team_members found. All members have valid user_ids.');
    console.log('\n✓ Cleanup complete');
    await sql.end();
    process.exit(0);
  }
  
  console.log(`Found ${orphanedMembers.length} orphaned team_members:`);
  orphanedMembers.forEach(member => {
    console.log(`  - Member ID: ${member.id}, Team ID: ${member.team_id}, User ID: ${member.user_id}, Joined: ${member.joined_at}`);
  });
  
  console.log('\nDeleting orphaned team_members...\n');
  
  // Delete orphaned team_members
  const deletedMembers = await sql`
    DELETE FROM app.team_members tm
    WHERE NOT EXISTS (
      SELECT 1 FROM app.users u WHERE u.id = tm.user_id
    )
    RETURNING id, team_id, user_id
  `;
  
  console.log(`✓ Deleted ${deletedMembers.length} orphaned team_members records`);
  
  // Show summary
  if (deletedMembers.length > 0) {
    console.log('\nDeleted members:');
    deletedMembers.forEach(member => {
      console.log(`  - Member ID: ${member.id}, Team ID: ${member.team_id}, User ID: ${member.user_id}`);
    });
  }
  
  console.log('\n✓ Cleanup complete');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Checking teams table...\n');
  
  // Check if passcode column exists
  const columnCheck = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'teams' AND column_name = 'passcode'
  `;
  
  if (columnCheck.length > 0) {
    console.log('✓ Passcode column exists');
    console.log(`  Type: ${columnCheck[0].data_type}, Nullable: ${columnCheck[0].is_nullable}\n`);
  } else {
    console.log('✗ Passcode column does NOT exist\n');
  }
  
  // Check unique constraint
  const constraintCheck = await sql`
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_schema = 'app' 
      AND table_name = 'teams' 
      AND constraint_name = 'teams_passcode_unique'
  `;
  
  if (constraintCheck.length > 0) {
    console.log('✓ Passcode unique constraint exists\n');
  } else {
    console.log('✗ Passcode unique constraint does NOT exist\n');
  }
  
  // Count teams
  const countResult = await sql`
    SELECT COUNT(*) as count FROM app.teams
  `;
  const teamCount = parseInt(countResult[0].count);
  
  console.log(`Team count: ${teamCount}`);
  
  if (teamCount === 0) {
    console.log('⚠ WARNING: Teams table is EMPTY - it may have been truncated!');
  } else {
    console.log('✓ Teams table has data');
  }
  
  // Check teams with passcodes
  const teamsWithPasscode = await sql`
    SELECT COUNT(*) as count FROM app.teams WHERE passcode IS NOT NULL
  `;
  const passcodeCount = parseInt(teamsWithPasscode[0].count);
  
  if (teamCount > 0) {
    console.log(`\nTeams with passcode: ${passcodeCount} / ${teamCount}`);
    
    if (passcodeCount < teamCount) {
      console.log(`⚠ WARNING: ${teamCount - passcodeCount} teams are missing passcodes`);
    } else if (passcodeCount === teamCount) {
      console.log('✓ All teams have passcodes');
    }
    
    // Show sample teams with passcodes
    if (teamCount > 0) {
      const sampleTeams = await sql`
        SELECT id, name, passcode, created_at
        FROM app.teams
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
      console.log('\nSample teams:');
      sampleTeams.forEach(team => {
        console.log(`  - ${team.name} (passcode: ${team.passcode || 'NULL'})`);
      });
    }
  }
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}


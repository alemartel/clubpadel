import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
const passcode = process.argv[2] || '5S4MGG';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log(`Checking passcode: ${passcode}\n`);
  
  // Check exact match
  const exactMatch = await sql`
    SELECT id, name, passcode, level, gender, created_at
    FROM app.teams
    WHERE passcode = ${passcode}
  `;
  
  // Check uppercase match
  const upperMatch = await sql`
    SELECT id, name, passcode, level, gender, created_at
    FROM app.teams
    WHERE passcode = ${passcode.toUpperCase()}
  `;
  
  console.log(`Exact match (${passcode}): ${exactMatch.length} teams`);
  if (exactMatch.length > 0) {
    exactMatch.forEach(team => {
      console.log(`  - ${team.name} (${team.passcode})`);
    });
  }
  
  console.log(`\nUppercase match (${passcode.toUpperCase()}): ${upperMatch.length} teams`);
  if (upperMatch.length > 0) {
    upperMatch.forEach(team => {
      console.log(`  - ${team.name} (${team.passcode})`);
    });
  }
  
  // Show all teams with passcodes
  console.log('\nAll teams with passcodes:');
  const allTeams = await sql`
    SELECT id, name, passcode, level, gender
    FROM app.teams
    ORDER BY created_at DESC
    LIMIT 10
  `;
  
  if (allTeams.length === 0) {
    console.log('  No teams found in database');
  } else {
    allTeams.forEach(team => {
      console.log(`  - ${team.name}: ${team.passcode}`);
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}


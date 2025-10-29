import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Verifying migration 0014 changes...\n');
  
  // Check users table for gender column
  const usersColumns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'users' AND column_name = 'gender'
  `;
  
  if (usersColumns.length > 0) {
    console.log('✅ users.gender column exists');
    console.log(`   Type: ${usersColumns[0].data_type}, Nullable: ${usersColumns[0].is_nullable}`);
  } else {
    console.log('❌ users.gender column NOT found');
  }
  
  // Check teams table for level and gender columns
  const teamsColumns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'app' AND table_name = 'teams'
    AND column_name IN ('level', 'gender', 'league_id', 'group_id')
    ORDER BY column_name
  `;
  
  console.log('\nTeams table columns:');
  for (const col of teamsColumns) {
    const status = col.column_name === 'level' || col.column_name === 'gender' 
      ? '✅' 
      : col.column_name === 'league_id' || col.column_name === 'group_id'
      ? '✅ (nullable)'
      : '';
    console.log(`   ${status} ${col.column_name}: ${col.data_type}, Nullable: ${col.is_nullable}`);
  }
  
  // Verify required columns exist
  const requiredColumns = ['level', 'gender'];
  const foundColumns = teamsColumns.map(c => c.column_name);
  const missingColumns = requiredColumns.filter(c => !foundColumns.includes(c));
  
  if (missingColumns.length === 0) {
    console.log('\n✅ All required columns are present in teams table');
  } else {
    console.log(`\n❌ Missing columns in teams table: ${missingColumns.join(', ')}`);
  }
  
  // Check if league_id and group_id are nullable
  const leagueIdCol = teamsColumns.find(c => c.column_name === 'league_id');
  const groupIdCol = teamsColumns.find(c => c.column_name === 'group_id');
  
  if (leagueIdCol?.is_nullable === 'YES') {
    console.log('✅ league_id is nullable');
  } else {
    console.log('⚠️  league_id is NOT nullable');
  }
  
  if (groupIdCol?.is_nullable === 'YES') {
    console.log('✅ group_id is nullable');
  } else {
    console.log('⚠️  group_id is NOT nullable');
  }
  
  console.log('\n✅ Verification complete!');
  
} catch (error) {
  console.error('\n❌ Verification error:', error.message);
  console.error(error);
  process.exit(1);
} finally {
  await sql.end();
}


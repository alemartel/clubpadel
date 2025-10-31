import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Checking all related tables...\n');
  
  const tables = ['teams', 'team_members', 'team_availability'];
  
  for (const table of tables) {
    const countResult = await sql`
      SELECT COUNT(*) as count FROM app.${sql(table)}
    `;
    const count = parseInt(countResult[0].count);
    console.log(`${table}: ${count} records`);
  }
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}


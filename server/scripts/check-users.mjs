import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Checking users in database...');
  
  // Get all users
  const users = await sql`
    SELECT id, email, role, level_validation_status, created_at, updated_at 
    FROM app.users 
    ORDER BY created_at DESC
  `;
  
  console.log(`Found ${users.length} users:`);
  users.forEach(user => {
    console.log(`- ${user.email} (${user.role}) - Level: ${user.level_validation_status || 'none'}`);
  });
  
  // Check specifically for jugador2@tercera.com
  const specificUser = await sql`
    SELECT * FROM app.users WHERE email = 'jugador2@tercera.com'
  `;
  
  if (specificUser.length > 0) {
    console.log('\njugador2@tercera.com found:');
    console.log(JSON.stringify(specificUser[0], null, 2));
  } else {
    console.log('\njugador2@tercera.com NOT found in database');
  }
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}

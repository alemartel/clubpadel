import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

try {
  console.log('Comparing working vs non-working users...\n');
  
  // Get all users with detailed info
  const users = await sql`
    SELECT 
      id, 
      email, 
      role, 
      level_validation_status, 
      claimed_level,
      created_at, 
      updated_at,
      first_name,
      last_name
    FROM app.users 
    ORDER BY created_at DESC
  `;
  
  console.log('All users:');
  console.log('='.repeat(80));
  users.forEach(user => {
    const status = user.level_validation_status || 'none';
    const level = user.claimed_level || 'none';
    console.log(`${user.email.padEnd(30)} | ${user.role.padEnd(6)} | ${status.padEnd(10)} | Level: ${level.padEnd(4)} | ID: ${user.id}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('Working users (admin + lauradeltoro):');
  const workingUsers = users.filter(u => 
    u.email === 'martelmarrero@gmail.com' || 
    u.email === 'lauradeltoro.arq@gmail.com'
  );
  workingUsers.forEach(user => {
    console.log(`✓ ${user.email} - ${user.role} - ${user.level_validation_status || 'none'}`);
  });
  
  console.log('\nNon-working users (jugador users):');
  const nonWorkingUsers = users.filter(u => 
    u.email.includes('jugador')
  );
  nonWorkingUsers.forEach(user => {
    console.log(`✗ ${user.email} - ${user.role} - ${user.level_validation_status || 'none'}`);
  });
  
  // Check for any differences in the data structure
  console.log('\n' + '='.repeat(80));
  console.log('Checking for data inconsistencies...');
  
  const workingUser = workingUsers[0];
  const nonWorkingUser = nonWorkingUsers[0];
  
  if (workingUser && nonWorkingUser) {
    console.log('\nComparing data structure:');
    console.log('Working user keys:', Object.keys(workingUser).sort());
    console.log('Non-working user keys:', Object.keys(nonWorkingUser).sort());
    
    // Check for null/undefined differences
    const workingKeys = Object.keys(workingUser);
    const nonWorkingKeys = Object.keys(nonWorkingUser);
    
    const allKeys = [...new Set([...workingKeys, ...nonWorkingKeys])];
    
    console.log('\nField-by-field comparison:');
    allKeys.forEach(key => {
      const workingValue = workingUser[key];
      const nonWorkingValue = nonWorkingUser[key];
      const workingType = typeof workingValue;
      const nonWorkingType = typeof nonWorkingValue;
      
      if (workingType !== nonWorkingType || workingValue !== nonWorkingValue) {
        console.log(`${key}:`);
        console.log(`  Working: ${workingValue} (${workingType})`);
        console.log(`  Non-working: ${nonWorkingValue} (${nonWorkingType})`);
      }
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}

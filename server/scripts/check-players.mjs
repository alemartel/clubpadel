import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
const sql = postgres(connectionString, { max: 1 });

try {
  console.log('Checking players in database...\n');
  
  // Get all players (non-admin users)
  const players = await sql`
    SELECT 
      id, 
      email, 
      first_name, 
      last_name, 
      phone_number, 
      dni, 
      tshirt_size, 
      gender, 
      role,
      created_at 
    FROM app.users 
    WHERE role = 'player'
    ORDER BY created_at DESC
  `;
  
  console.log(`Found ${players.length} players:\n`);
  console.log('=' .repeat(80));
  
  players.forEach((player, index) => {
    const name = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'No name';
    console.log(`\n${index + 1}. ${name} (${player.email})`);
    console.log(`   Phone: ${player.phone_number || '❌ Not set'}`);
    console.log(`   DNI: ${player.dni || '❌ Not set'}`);
    console.log(`   T-shirt Size: ${player.tshirt_size || '❌ Not set'}`);
    console.log(`   Gender: ${player.gender || '❌ Not set'}`);
    console.log(`   Created: ${new Date(player.created_at).toLocaleDateString()}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`\nTotal: ${players.length} players`);
  
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await sql.end();
}


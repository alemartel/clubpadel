import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
const sql = postgres(connectionString, { max: 1 });

const playersToUpdate = [
  'jugador1@tercera.com',
  'jugador1@cuarta.com',
  'jugador3@tercera.com',
  'jugador5@tercera.com',
  'jugador7@tercera.com',
  'jugador9@tercera.com',
  'jugador11@tercera.com'
];

try {
  console.log('Updating player genders to "male" (masculine)...\n');
  
  for (const email of playersToUpdate) {
    const result = await sql`
      UPDATE app.users 
      SET gender = 'male', updated_at = NOW()
      WHERE email = ${email} AND role = 'player'
      RETURNING id, email, first_name, last_name, gender
    `;
    
    if (result.length > 0) {
      const player = result[0];
      console.log(`✓ Updated ${player.first_name || ''} ${player.last_name || ''} (${player.email}) -> ${player.gender}`);
    } else {
      console.log(`✗ Player not found: ${email}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\nVerifying updates...\n');
  
  const updatedPlayers = await sql`
    SELECT email, first_name, last_name, gender 
    FROM app.users 
    WHERE email = ANY(${playersToUpdate})
    ORDER BY email
  `;
  
  updatedPlayers.forEach(player => {
    console.log(`- ${player.first_name || ''} ${player.last_name || ''} (${player.email}): ${player.gender || '❌ Not set'}`);
  });
  
  console.log(`\n✅ Updated ${updatedPlayers.filter(p => p.gender === 'male').length} players successfully.`);
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}


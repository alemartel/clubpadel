import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
const sql = postgres(connectionString, { max: 1 });

const playersToUpdate = [
  'jugador2@tercera.com',
  'jugador2@cuarta.com',
  'jugador4@tercera.com',
  'jugador6@tercera.com',
  'jugador8@tercera.com',
  'jugador10@tercera.com'
];

try {
  console.log('Updating player genders to "female" (femenine)...\n');
  
  for (const email of playersToUpdate) {
    const result = await sql`
      UPDATE app.users 
      SET gender = 'female', updated_at = NOW()
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
  
  console.log(`\n✅ Updated ${updatedPlayers.filter(p => p.gender === 'female').length} players successfully.`);
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await sql.end();
}


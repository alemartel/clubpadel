import postgres from 'postgres';
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

async function checkUser(email) {
  try {
    console.log(`Checking user: ${email}\n`);
    
    // Check if user exists in database
    const [dbUser] = await sql`
      SELECT id, email, role, first_name, last_name, gender, created_at, updated_at 
      FROM app.users 
      WHERE email = ${email}
      LIMIT 1
    `;
    
    if (dbUser) {
      console.log('✓ User exists in database:');
      console.log('  ID:', dbUser.id);
      console.log('  Email:', dbUser.email);
      console.log('  Role:', dbUser.role);
      console.log('  Name:', dbUser.first_name, dbUser.last_name);
      console.log('  Gender:', dbUser.gender);
      console.log('  Created:', dbUser.created_at);
      console.log('  Updated:', dbUser.updated_at);
      console.log('\n⚠️  Note: Password is stored in Firebase, not in this database.');
      console.log('  If login fails with 400 error, possible causes:');
      console.log('  1. User does not exist in Firebase Authentication');
      console.log('  2. Password is incorrect');
      console.log('  3. User account is disabled in Firebase');
      console.log('\n  To fix:');
      console.log('  - Use Firebase Console to reset password');
      console.log('  - Or use "Forgot Password" on login page');
      console.log('  - Or create user in Firebase Console if missing');
    } else {
      console.log('✗ User NOT found in database');
      console.log('\n  This means the user needs to:');
      console.log('  1. Register first using the registration page');
      console.log('  2. Or be created in Firebase Authentication first');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

const email = process.argv[2] || 'jugador6@tercera.com';
checkUser(email).catch(console.error);


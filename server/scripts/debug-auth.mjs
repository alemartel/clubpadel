import postgres from 'postgres';
import { verifyFirebaseToken } from '../src/lib/firebase-auth.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

// Test the full authentication flow for jugador1@tercera.com
async function testAuthFlow() {
  console.log('Testing authentication flow for jugador1@tercera.com...\n');
  
  try {
    // Step 1: Check if user exists in database
    const [existingUser] = await sql`
      SELECT * FROM app.users 
      WHERE email = 'jugador1@tercera.com'
      LIMIT 1
    `;
    
    if (existingUser) {
      console.log('✓ User exists in database:');
      console.log('  ID:', existingUser.id);
      console.log('  Email:', existingUser.email);
      console.log('  Role:', existingUser.role);
    } else {
      console.log('✗ User not found in database');
    }
    
    // Step 2: Test Firebase token verification (simulated)
    console.log('\nTesting Firebase token verification...');
    
    // Create a mock token for testing
    const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZWFwaXMuY29tL2RlbW8tcHJvamVjdCIsImF1ZCI6ImRlbW8tcHJvamVjdCIsImF1dGhfdGltZSI6MTYzMDAwMDAwMCwidXNlcl9pZCI6InRlc3QtdXNlci1pZCIsInN1YiI6InRlc3QtdXNlci1pZCIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5LCJlbWFpbCI6Imp1Z2Fkb3IxQHRlcmNlcmEuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWV9.test-signature';
    
    try {
      const firebaseUser = await verifyFirebaseToken(mockToken, 'demo-project');
      console.log('✓ Firebase token verification successful:');
      console.log('  Firebase ID:', firebaseUser.id);
      console.log('  Email:', firebaseUser.email);
      
      // Step 3: Test user upsert operation
      console.log('\nTesting user upsert operation...');
      
      const upsertResult = await sql`
        INSERT INTO app.users (
          id, email, display_name, photo_url, role
        ) VALUES (
          ${firebaseUser.id}, 
          ${firebaseUser.email}, 
          null, 
          null, 
          'player'
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING *
      `;
      
      console.log('✓ Upsert operation completed');
      console.log('  Rows affected:', upsertResult.length);
      
      // Step 4: Test user retrieval
      console.log('\nTesting user retrieval...');
      
      const [retrievedUser] = await sql`
        SELECT * FROM app.users 
        WHERE id = ${firebaseUser.id}
        LIMIT 1
      `;
      
      if (retrievedUser) {
        console.log('✓ User retrieved successfully:');
        console.log('  ID:', retrievedUser.id);
        console.log('  Email:', retrievedUser.email);
        console.log('  Role:', retrievedUser.role);
      } else {
        console.log('✗ User retrieval failed');
      }
      
    } catch (error) {
      console.log('✗ Firebase token verification failed:', error.message);
    }
    
  } catch (error) {
    console.log('✗ Database error:', error.message);
  }
}

async function main() {
  await testAuthFlow();
  await sql.end();
}

main().catch(console.error);

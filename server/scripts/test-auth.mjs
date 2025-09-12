import postgres from 'postgres';
import { verifyFirebaseToken } from '../src/lib/firebase-auth.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

// Test Firebase token verification
async function testTokenVerification() {
  console.log('Testing Firebase token verification...\n');
  
  // Get the Firebase project ID
  const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-project';
  console.log('Using Firebase project ID:', projectId);
  
  // Test with a sample token (this would normally come from the client)
  // For testing, we'll create a mock token structure
  const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZWFwaXMuY29tL2RlbW8tcHJvamVjdCIsImF1ZCI6ImRlbW8tcHJvamVjdCIsImF1dGhfdGltZSI6MTYzMDAwMDAwMCwidXNlcl9pZCI6InRlc3QtdXNlci1pZCIsInN1YiI6InRlc3QtdXNlci1pZCIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5LCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0.test-signature';
  
  try {
    const firebaseUser = await verifyFirebaseToken(mockToken, projectId);
    console.log('✓ Token verification successful:', firebaseUser);
  } catch (error) {
    console.log('✗ Token verification failed:', error.message);
  }
}

// Test database user lookup
async function testUserLookup() {
  console.log('\nTesting database user lookup...\n');
  
  const testUsers = [
    'lauradeltoro.arq@gmail.com', // Working
    'jugador2@tercera.com',       // Not working
    'martelmarrero@gmail.com'     // Working
  ];
  
  for (const email of testUsers) {
    try {
      const [user] = await sql`
        SELECT id, email, role, level_validation_status 
        FROM app.users 
        WHERE email = ${email}
        LIMIT 1
      `;
      
      if (user) {
        console.log(`✓ Found user ${email}:`, {
          id: user.id,
          role: user.role,
          level_status: user.level_validation_status
        });
      } else {
        console.log(`✗ User ${email} not found`);
      }
    } catch (error) {
      console.log(`✗ Error looking up ${email}:`, error.message);
    }
  }
}

// Test the full authentication flow simulation
async function testAuthFlow() {
  console.log('\nTesting authentication flow simulation...\n');
  
  // Simulate the auth middleware logic
  const testEmail = 'jugador2@tercera.com';
  
  try {
    // Step 1: Get user from database
    const [user] = await sql`
      SELECT * FROM app.users 
      WHERE email = ${testEmail}
      LIMIT 1
    `;
    
    if (!user) {
      console.log('✗ User not found in database');
      return;
    }
    
    console.log('✓ User found in database:', {
      id: user.id,
      email: user.email,
      role: user.role,
      level_validation_status: user.level_validation_status
    });
    
    // Step 2: Check if user has required fields
    if (!user.id || !user.email || !user.role) {
      console.log('✗ User missing required fields');
      return;
    }
    
    console.log('✓ User has all required fields');
    
    // Step 3: Simulate setting user in context
    console.log('✓ User would be set in context successfully');
    
  } catch (error) {
    console.log('✗ Auth flow error:', error.message);
  }
}

async function main() {
  try {
    await testTokenVerification();
    await testUserLookup();
    await testAuthFlow();
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await sql.end();
  }
}

main();

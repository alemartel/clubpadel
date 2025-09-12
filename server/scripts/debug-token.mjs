import { createRemoteJWKSet } from 'jose';

// Test the Firebase emulator JWKS endpoint
async function testJWKSEndpoint() {
  console.log('Testing Firebase emulator JWKS endpoint...\n');
  
  const firebaseAuthHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:5503';
  const emulatorUrl = firebaseAuthHost.startsWith('http') 
    ? firebaseAuthHost 
    : `http://${firebaseAuthHost}`;
  
  const jwksUrl = `${emulatorUrl}/www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;
  console.log('JWKS URL:', jwksUrl);
  
  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    console.log('✓ JWKS endpoint is accessible');
    
    // Try to fetch the keys
    const keys = await JWKS({ alg: 'RS256' });
    console.log('✓ JWKS keys fetched successfully');
    
  } catch (error) {
    console.log('✗ JWKS endpoint error:', error.message);
  }
}

// Test token decoding (without verification)
function testTokenDecoding() {
  console.log('\nTesting token decoding...\n');
  
  // This is a mock token structure for testing
  const mockToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZWFwaXMuY29tL2RlbW8tcHJvamVjdCIsImF1ZCI6ImRlbW8tcHJvamVjdCIsImF1dGhfdGltZSI6MTYzMDAwMDAwMCwidXNlcl9pZCI6InRlc3QtdXNlci1pZCIsInN1YiI6InRlc3QtdXNlci1pZCIsImlhdCI6MTYzMDAwMDAwMCwiZXhwIjo5OTk5OTk5OTk5LCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0.test-signature';
  
  try {
    const parts = mockToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    console.log('✓ Token decoded successfully:');
    console.log('  sub (user ID):', payload.sub);
    console.log('  email:', payload.email);
    console.log('  aud (audience):', payload.aud);
    console.log('  iss (issuer):', payload.iss);
    
  } catch (error) {
    console.log('✗ Token decoding error:', error.message);
  }
}

// Test the environment variables
function testEnvironment() {
  console.log('\nTesting environment variables...\n');
  
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const firebaseAuthHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const isDev = process.env.NODE_ENV === 'development';
  
  console.log('FIREBASE_PROJECT_ID:', firebaseProjectId || 'NOT SET');
  console.log('FIREBASE_AUTH_EMULATOR_HOST:', firebaseAuthHost || 'NOT SET');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
  console.log('Is development mode:', isDev);
  
  if (!firebaseProjectId) {
    console.log('⚠️  WARNING: FIREBASE_PROJECT_ID is not set');
  }
  
  if (!firebaseAuthHost) {
    console.log('⚠️  WARNING: FIREBASE_AUTH_EMULATOR_HOST is not set');
  }
}

async function main() {
  testEnvironment();
  await testJWKSEndpoint();
  testTokenDecoding();
}

main().catch(console.error);

import admin from 'firebase-admin';
import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5502/postgres';
const firebaseAuthHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:5503';
const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-project';

// Initialize Firebase Admin for emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: projectId,
  });
}

// Set emulator connection
process.env.FIREBASE_AUTH_EMULATOR_HOST = firebaseAuthHost;

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5
});

async function listFirebaseUsers() {
  try {
    console.log('🔥 Fetching users from Firebase Auth emulator...');
    console.log(`   Emulator: ${firebaseAuthHost}`);
    console.log(`   Project: ${projectId}\n`);

    const auth = admin.auth();
    const listUsersResult = await auth.listUsers();
    
    console.log(`✓ Found ${listUsersResult.users.length} users in Firebase Auth emulator:\n`);
    console.log('='.repeat(100));
    
    const firebaseUsers = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email || '(no email)',
      emailVerified: user.emailVerified || false,
      displayName: user.displayName || null,
      disabled: user.disabled || false,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime || null,
      },
      providerData: user.providerData.map(p => ({
        providerId: p.providerId,
        email: p.email,
      })),
    }));

    firebaseUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Disabled: ${user.disabled}`);
      console.log(`   Created: ${user.metadata.creationTime}`);
      console.log(`   Last Sign In: ${user.metadata.lastSignInTime || 'Never'}`);
      console.log(`   Providers: ${user.providerData.map(p => p.providerId).join(', ')}`);
      console.log('');
    });

    return firebaseUsers;
  } catch (error) {
    console.error('❌ Error fetching Firebase users:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Firebase Auth emulator is not running!');
      console.error('   Make sure to start the dev server with: pnpm dev');
    }
    throw error;
  }
}

async function listDatabaseUsers() {
  try {
    console.log('🗄️  Fetching users from database...\n');

    const dbUsers = await sql`
      SELECT 
        id, 
        email, 
        role, 
        first_name, 
        last_name,
        display_name,
        created_at, 
        updated_at
      FROM app.users 
      ORDER BY created_at DESC
    `;

    console.log(`✓ Found ${dbUsers.length} users in database:\n`);
    console.log('='.repeat(100));

    dbUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A');
      console.log(`   Display Name: ${user.display_name || 'N/A'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Updated: ${user.updated_at}`);
      console.log('');
    });

    return dbUsers;
  } catch (error) {
    console.error('❌ Error fetching database users:', error.message);
    throw error;
  }
}

async function compareUsers(firebaseUsers, dbUsers) {
  console.log('\n' + '='.repeat(100));
  console.log('🔍 COMPARISON RESULTS\n');

  // Create maps for easier lookup
  const firebaseByEmail = new Map();
  const firebaseByUid = new Map();
  firebaseUsers.forEach(u => {
    if (u.email && u.email !== '(no email)') {
      firebaseByEmail.set(u.email.toLowerCase(), u);
    }
    firebaseByUid.set(u.uid, u);
  });

  const dbByEmail = new Map();
  const dbById = new Map();
  dbUsers.forEach(u => {
    dbByEmail.set(u.email.toLowerCase(), u);
    dbById.set(u.id, u);
  });

  // Users in Firebase but not in database
  const onlyInFirebase = firebaseUsers.filter(fu => {
    if (!fu.email || fu.email === '(no email)') return false;
    return !dbByEmail.has(fu.email.toLowerCase()) && !dbById.has(fu.uid);
  });

  // Users in database but not in Firebase
  const onlyInDatabase = dbUsers.filter(du => {
    return !firebaseByEmail.has(du.email.toLowerCase()) && !firebaseByUid.has(du.id);
  });

  // Users in both but with mismatched IDs
  const mismatchedIds = [];
  firebaseUsers.forEach(fu => {
    if (!fu.email || fu.email === '(no email)') return;
    const dbUser = dbByEmail.get(fu.email.toLowerCase());
    if (dbUser && dbUser.id !== fu.uid) {
      mismatchedIds.push({ firebase: fu, database: dbUser });
    }
  });

  // Users in both (matched)
  const matched = firebaseUsers.filter(fu => {
    if (!fu.email || fu.email === '(no email)') return false;
    const dbUser = dbByEmail.get(fu.email.toLowerCase());
    return dbUser && dbUser.id === fu.uid;
  });

  console.log(`✅ Matched users (in both Firebase and Database): ${matched.length}`);
  matched.forEach(u => {
    console.log(`   ✓ ${u.email} (${u.uid})`);
  });

  if (onlyInFirebase.length > 0) {
    console.log(`\n⚠️  Users ONLY in Firebase (not in database): ${onlyInFirebase.length}`);
    onlyInFirebase.forEach(u => {
      console.log(`   - ${u.email} (${u.uid})`);
      console.log(`     Created: ${u.metadata.creationTime}`);
    });
  } else {
    console.log(`\n✅ No users found only in Firebase`);
  }

  if (onlyInDatabase.length > 0) {
    console.log(`\n⚠️  Users ONLY in Database (not in Firebase): ${onlyInDatabase.length}`);
    onlyInDatabase.forEach(u => {
      console.log(`   - ${u.email} (${u.id})`);
      console.log(`     Role: ${u.role}`);
      console.log(`     Created: ${u.created_at}`);
    });
  } else {
    console.log(`\n✅ No users found only in Database`);
  }

  if (mismatchedIds.length > 0) {
    console.log(`\n⚠️  Users with mismatched IDs (same email, different ID): ${mismatchedIds.length}`);
    mismatchedIds.forEach(({ firebase, database }) => {
      console.log(`   - ${firebase.email}`);
      console.log(`     Firebase UID: ${firebase.uid}`);
      console.log(`     Database ID: ${database.id}`);
    });
  } else {
    console.log(`\n✅ No mismatched IDs found`);
  }

  console.log('\n' + '='.repeat(100));
  console.log(`\n📊 Summary:`);
  console.log(`   Firebase Users: ${firebaseUsers.length}`);
  console.log(`   Database Users: ${dbUsers.length}`);
  console.log(`   Matched: ${matched.length}`);
  console.log(`   Only in Firebase: ${onlyInFirebase.length}`);
  console.log(`   Only in Database: ${onlyInDatabase.length}`);
  console.log(`   Mismatched IDs: ${mismatchedIds.length}`);
}

async function main() {
  try {
    const firebaseUsers = await listFirebaseUsers();
    const dbUsers = await listDatabaseUsers();
    await compareUsers(firebaseUsers, dbUsers);
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();


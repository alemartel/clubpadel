import postgres from "postgres";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5502/postgres";

async function checkPendingRequests() {
  const sql = postgres(connectionString);
  try {
    console.log("🔍 Checking pending level validation requests...");
    
    const pendingRequests = await sql`
      SELECT 
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.claimed_level,
        u.level_validation_status,
        u.level_validated_at,
        u.level_validated_by,
        u.level_validation_notes
      FROM app.users u
      WHERE u.level_validation_status = 'pending'
      ORDER BY u.created_at DESC
    `;
    
    console.log("📋 Pending level validation requests:");
    if (pendingRequests.length === 0) {
      console.log("✅ No pending requests found");
    } else {
      console.table(pendingRequests);
    }
    
  } catch (error) {
    console.error("❌ Error checking pending requests:", error);
  } finally {
    await sql.end();
  }
}

checkPendingRequests();

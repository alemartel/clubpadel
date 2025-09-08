import postgres from "postgres";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5502/postgres";

async function removeAdminPendingRequest() {
  const sql = postgres(connectionString);
  try {
    console.log("🗑️ Removing pending level validation request for admin user...");
    
    // First, let's confirm the admin user details
    const adminUser = await sql`
      SELECT id, email, role, claimed_level, level_validation_status
      FROM app.users 
      WHERE email = 'martelmarrero@gmail.com' AND role = 'admin'
    `;
    
    if (adminUser.length === 0) {
      console.log("❌ Admin user not found");
      return;
    }
    
    console.log("👤 Admin user found:", adminUser[0]);
    
    // Remove the pending level validation request by resetting the fields
    const result = await sql`
      UPDATE app.users 
      SET 
        claimed_level = NULL,
        level_validation_status = 'none',
        level_validated_at = NULL,
        level_validated_by = NULL,
        level_validation_notes = NULL
      WHERE email = 'martelmarrero@gmail.com' AND role = 'admin'
      RETURNING id, email, role, claimed_level, level_validation_status
    `;
    
    console.log("✅ Successfully removed pending level validation request");
    console.log("📋 Updated admin user:", result[0]);
    
  } catch (error) {
    console.error("❌ Error removing pending request:", error);
  } finally {
    await sql.end();
  }
}

removeAdminPendingRequest();

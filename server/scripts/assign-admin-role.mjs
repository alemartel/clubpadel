#!/usr/bin/env node

/**
 * Migration script to assign admin role to specific user
 * This script should be run after the role column has been added to the users table
 */

import postgres from "postgres";
import "dotenv/config";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5502/postgres";

if (!connectionString) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const ADMIN_EMAIL = "martelmarrero@gmail.com";

console.log("🔐 Assigning admin role to specified user...");

async function assignAdminRole() {
  const sql = postgres(connectionString);

  try {
    // Check if the user exists
    const existingUser = await sql`
      SELECT id, email, role 
      FROM app.users 
      WHERE email = ${ADMIN_EMAIL}
    `;

    if (existingUser.length === 0) {
      console.log(`⚠️  User with email ${ADMIN_EMAIL} not found in database.`);
      console.log(
        "   This user will be assigned admin role when they first register."
      );
      return;
    }

    const user = existingUser[0];

    if (user.role === "admin") {
      console.log(`✅ User ${ADMIN_EMAIL} already has admin role.`);
      return;
    }

    // Update the user's role to admin
    await sql`
      UPDATE app.users 
      SET role = 'admin', updated_at = NOW()
      WHERE email = ${ADMIN_EMAIL}
    `;

    console.log(`✅ Successfully assigned admin role to ${ADMIN_EMAIL}`);

    // Verify the update
    const updatedUser = await sql`
      SELECT id, email, role 
      FROM app.users 
      WHERE email = ${ADMIN_EMAIL}
    `;

    console.log("📋 Updated user details:", updatedUser[0]);
  } catch (error) {
    console.error("❌ Error assigning admin role:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

assignAdminRole();

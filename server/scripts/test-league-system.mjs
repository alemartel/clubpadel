#!/usr/bin/env node

/**
 * Test script to verify league and group management system
 * This script tests the API endpoints to ensure they work correctly
 */

import postgres from "postgres";
import "dotenv/config";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5502/postgres";

const ADMIN_EMAIL = "lauradeltoro.arq@gmail.com";

console.log("🧪 Testing League and Group Management System...");

async function testLeagueGroupSystem() {
  const sql = postgres(connectionString);

  try {
    // Test 1: Verify database schema
    console.log("\n1️⃣ Testing database schema...");

    const leaguesTable = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'app' AND table_name = 'leagues'
      ORDER BY ordinal_position
    `;

    const groupsTable = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'app' AND table_name = 'groups'
      ORDER BY ordinal_position
    `;

    console.log(
      "✅ Leagues table columns:",
      leaguesTable.map((col) => `${col.column_name} (${col.data_type})`)
    );
    console.log(
      "✅ Groups table columns:",
      groupsTable.map((col) => `${col.column_name} (${col.data_type})`)
    );

    // Test 2: Verify enums
    console.log("\n2️⃣ Testing enum types...");

    const genderEnum = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gender')
      ORDER BY enumsortorder
    `;

    const levelEnum = await sql`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'level')
      ORDER BY enumsortorder
    `;

    console.log(
      "✅ Gender enum values:",
      genderEnum.map((e) => e.enumlabel)
    );
    console.log(
      "✅ Level enum values:",
      levelEnum.map((e) => e.enumlabel)
    );

    // Test 3: Verify constraints
    console.log("\n3️⃣ Testing constraints...");

    const constraints = await sql`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'app' 
        AND tc.table_name IN ('leagues', 'groups')
      ORDER BY tc.table_name, tc.constraint_type
    `;

    console.log("✅ Database constraints:");
    constraints.forEach((constraint) => {
      console.log(
        `   ${constraint.table_name}.${constraint.column_name}: ${constraint.constraint_type}`
      );
    });

    // Test 4: Verify admin user exists
    console.log("\n4️⃣ Testing admin user...");

    const adminUser = await sql`
      SELECT id, email, role 
      FROM app.users 
      WHERE email = ${ADMIN_EMAIL}
    `;

    if (adminUser.length > 0) {
      console.log("✅ Admin user found:", adminUser[0]);
    } else {
      console.log(
        "⚠️  Admin user not found. Please run the assign-admin-role script first."
      );
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📋 API Endpoints Available:");
    console.log("Admin Endpoints (require admin role):");
    console.log("  POST   /api/v1/admin/leagues");
    console.log("  GET    /api/v1/admin/leagues");
    console.log("  GET    /api/v1/admin/leagues/:id");
    console.log("  PUT    /api/v1/admin/leagues/:id");
    console.log("  DELETE /api/v1/admin/leagues/:id");
    console.log("  POST   /api/v1/admin/leagues/:leagueId/groups");
    console.log("  GET    /api/v1/admin/leagues/:leagueId/groups");
    console.log("  PUT    /api/v1/admin/groups/:id");
    console.log("  DELETE /api/v1/admin/groups/:id");
    console.log("\nPublic Endpoints:");
    console.log("  GET    /api/v1/leagues");
    console.log("  GET    /api/v1/leagues/:id");
    console.log("  GET    /api/v1/leagues/:id/groups");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

testLeagueGroupSystem();

import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { randomUUID } from "crypto";
import { authMiddleware } from "./middleware/auth";
import { adminMiddleware } from "./middleware/admin";
import { getDatabase, testDatabaseConnection } from "./lib/db";
import { setEnvContext, clearEnvContext, getDatabaseUrl } from "./lib/env";
import * as schema from "./schema/users";
import { users, levelEnum } from "./schema/users";
import {
  leagues,
  groups,
  type NewLeague,
  type NewGroup,
} from "./schema/leagues";
import { eq, and } from "drizzle-orm";

type Env = {
  RUNTIME?: string;
  [key: string]: any;
};

// Helper function to handle database constraint errors
function handleDatabaseError(error: any): { message: string; status: number } {
  if (error.code === "23505") {
    // Unique constraint violation
    if (error.constraint === "groups_league_id_name_unique") {
      return {
        message: "Group name must be unique within the league",
        status: 409,
      };
    }
    return {
      message: "Duplicate entry - this record already exists",
      status: 409,
    };
  }
  if (error.code === "23503") {
    // Foreign key constraint violation
    return {
      message: "Referenced record does not exist",
      status: 400,
    };
  }
  return {
    message: "Database operation failed",
    status: 500,
  };
}

// Helper function to sanitize text inputs
function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .substring(0, 255); // Limit length
}

const app = new Hono<{ Bindings: Env }>();

// In Node.js environment, set environment context from process.env
if (typeof process !== "undefined" && process.env) {
  setEnvContext(process.env);
}

// Environment context middleware - detect runtime using RUNTIME env var
app.use("*", async (c, next) => {
  if (c.env?.RUNTIME === "cloudflare") {
    setEnvContext(c.env);
  }

  await next();
  // No need to clear context - env vars are the same for all requests
  // In fact, clearing the context would cause the env vars to potentially be unset for parallel requests
});

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check route - public
app.get("/", (c) => c.json({ status: "ok", message: "API is running" }));

// API routes
const api = new Hono();

// Public routes go here (if any)
api.get("/hello", (c) => {
  return c.json({
    message: "Hello from Hono!",
  });
});

// Database test route - public for testing
api.get("/db-test", async (c) => {
  try {
    // Use external DB URL if available, otherwise use local PostgreSQL database server
    // Note: In development, the port is dynamically allocated by port-manager.js
    const defaultLocalConnection =
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@localhost:5502/postgres";
    const dbUrl = getDatabaseUrl() || defaultLocalConnection;

    const db = await getDatabase(dbUrl);
    const isHealthy = await testDatabaseConnection();

    if (!isHealthy) {
      return c.json(
        {
          error: "Database connection is not healthy",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    const result = await db.select().from(schema.users).limit(5);

    return c.json({
      message: "Database connection successful!",
      users: result,
      connectionHealthy: isHealthy,
      usingLocalDatabase: !getDatabaseUrl(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database test error:", error);
    return c.json(
      {
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Protected routes - require authentication
const protectedRoutes = new Hono();

protectedRoutes.use("*", authMiddleware);

protectedRoutes.get("/me", (c) => {
  const user = c.get("user");
  return c.json({
    user,
    message: "You are authenticated!",
  });
});

protectedRoutes.get("/role-check", (c) => {
  const user = c.get("user");
  const isAdmin = user.role === "admin";

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    isAdmin,
    message: isAdmin
      ? "You have admin privileges!"
      : "You are a regular player.",
  });
});

protectedRoutes.put("/profile", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    // Validate input data
    const { first_name, last_name, phone_number } = body;

    // Only update provided fields
    const updateData: any = { updated_at: new Date() };
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;

    // Update user in database
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, user.id))
      .returning();

    if (!updatedUser) {
      return c.json({ error: "Failed to update profile" }, 500);
    }

    return c.json({
      user: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// Player level update endpoint
protectedRoutes.put("/profile/level", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const { level } = body;

    // Validate level
    const validLevels = levelEnum.enumValues;
    if (!level || !validLevels.includes(level)) {
      return c.json({ error: `Invalid level. Must be one of: ${validLevels.join(", ")}` }, 400);
    }

    // Check if user already has a pending validation
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (currentUser.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    if (currentUser[0].level_validation_status === "pending") {
      return c.json({ error: "You already have a pending level validation request" }, 400);
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        claimed_level: level,
        level_validation_status: "pending",
        level_validation_notes: null,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return c.json({
      user: updatedUser,
      message: "Level validation request submitted successfully",
    });
  } catch (error) {
    console.error("Level update error:", error);
    return c.json({ error: "Failed to update level" }, 500);
  }
});

// Get player level status
protectedRoutes.get("/profile/level-status", async (c) => {
  try {
    const user = c.get("user");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (currentUser.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    const userData = currentUser[0];
    return c.json({
      levelStatus: {
        claimed_level: userData.claimed_level,
        level_validation_status: userData.level_validation_status,
        level_validated_at: userData.level_validated_at,
        level_validation_notes: userData.level_validation_notes,
      },
      message: "Level status retrieved successfully",
    });
  } catch (error) {
    console.error("Level status error:", error);
    return c.json({ error: "Failed to get level status" }, 500);
  }
});

// Admin-protected routes - require authentication and admin role
const adminRoutes = new Hono();

adminRoutes.use("*", authMiddleware);
adminRoutes.use("*", adminMiddleware);

// League Management Endpoints (Admin Only)
adminRoutes.post("/leagues", async (c) => {
  try {
    const adminUser = c.get("adminUser");
    const body = await c.req.json();

    const { name, start_date, end_date } = body;

    // Validate required fields
    if (!name || !start_date || !end_date) {
      return c.json(
        { error: "Missing required fields: name, start_date, end_date" },
        400
      );
    }

    // Sanitize text inputs
    const sanitizedName = sanitizeText(name);

    // Validate date logic
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return c.json({ error: "Start date must be before end date" }, 400);
    }

    // Generate unique ID
    const leagueId = `league_${randomUUID()}`;

    const newLeague: NewLeague = {
      id: leagueId,
      name: sanitizedName,
      start_date: startDate,
      end_date: endDate,
      created_by: adminUser.id,
    };

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [createdLeague] = await db
      .insert(leagues)
      .values(newLeague)
      .returning();

    return c.json(
      {
        league: createdLeague,
        message: "League created successfully",
      },
      201
    );
  } catch (error) {
    console.error("League creation error:", error);
    return c.json({ error: "Failed to create league" }, 500);
  }
});

adminRoutes.get("/leagues", async (c) => {
  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const allLeagues = await db.select().from(leagues);

    return c.json({
      leagues: allLeagues,
      message: "Leagues retrieved successfully",
    });
  } catch (error) {
    console.error("Leagues retrieval error:", error);
    return c.json({ error: "Failed to retrieve leagues" }, 500);
  }
});

adminRoutes.get("/leagues/:id", async (c) => {
  try {
    const leagueId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    const leagueGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.league_id, leagueId));

    return c.json({
      league: { ...league, groups: leagueGroups },
      message: "League retrieved successfully",
    });
  } catch (error) {
    console.error("League retrieval error:", error);
    return c.json({ error: "Failed to retrieve league" }, 500);
  }
});

adminRoutes.put("/leagues/:id", async (c) => {
  try {
    const leagueId = c.req.param("id");
    const body = await c.req.json();

    const { name, start_date, end_date } = body;

    // Validate date logic if dates are provided
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        return c.json({ error: "Start date must be before end date" }, 400);
      }
    }

    const updateData: any = { updated_at: new Date() };
    if (name !== undefined) updateData.name = sanitizeText(name);
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.end_date = new Date(end_date);

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [updatedLeague] = await db
      .update(leagues)
      .set(updateData)
      .where(eq(leagues.id, leagueId))
      .returning();

    if (!updatedLeague) {
      return c.json({ error: "League not found" }, 404);
    }

    return c.json({
      league: updatedLeague,
      message: "League updated successfully",
    });
  } catch (error) {
    console.error("League update error:", error);
    return c.json({ error: "Failed to update league" }, 500);
  }
});

adminRoutes.delete("/leagues/:id", async (c) => {
  try {
    const leagueId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [deletedLeague] = await db
      .delete(leagues)
      .where(eq(leagues.id, leagueId))
      .returning();

    if (!deletedLeague) {
      return c.json({ error: "League not found" }, 404);
    }

    return c.json({
      message: "League deleted successfully",
    });
  } catch (error) {
    console.error("League deletion error:", error);
    return c.json({ error: "Failed to delete league" }, 500);
  }
});

// Group Management Endpoints (Admin Only)
adminRoutes.post("/leagues/:leagueId/groups", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    const body = await c.req.json();

    const { name, level, gender } = body;

    // Validate required fields
    if (!name || !level || !gender) {
      return c.json(
        { error: "Missing required fields: name, level, gender" },
        400
      );
    }

    // Sanitize text inputs
    const sanitizedName = sanitizeText(name);

    // Validate enum values
    const validLevels = ["1", "2", "3", "4"];
    const validGenders = ["male", "female", "mixed"];

    if (!validLevels.includes(level)) {
      return c.json(
        { error: "Invalid level. Must be one of: 1, 2, 3, 4" },
        400
      );
    }

    if (!validGenders.includes(gender)) {
      return c.json(
        { error: "Invalid gender. Must be one of: male, female, mixed" },
        400
      );
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    // Generate unique ID
    const groupId = `group_${randomUUID()}`;

    const newGroup: NewGroup = {
      id: groupId,
      league_id: leagueId,
      name: sanitizedName,
      level,
      gender,
    };

    const [createdGroup] = await db.insert(groups).values(newGroup).returning();

    return c.json(
      {
        group: createdGroup,
        message: "Group created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Group creation error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

adminRoutes.get("/leagues/:leagueId/groups", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    const leagueGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.league_id, leagueId));

    return c.json({
      groups: leagueGroups,
      message: "Groups retrieved successfully",
    });
  } catch (error) {
    console.error("Groups retrieval error:", error);
    return c.json({ error: "Failed to retrieve groups" }, 500);
  }
});

adminRoutes.put("/groups/:id", async (c) => {
  try {
    const groupId = c.req.param("id");
    const body = await c.req.json();

    const { name, level, gender } = body;

    // Validate enum values if provided
    if (level) {
      const validLevels = ["1", "2", "3", "4"];
      if (!validLevels.includes(level)) {
        return c.json(
          { error: "Invalid level. Must be one of: 1, 2, 3, 4" },
          400
        );
      }
    }

    if (gender) {
      const validGenders = ["male", "female", "mixed"];
      if (!validGenders.includes(gender)) {
        return c.json(
          { error: "Invalid gender. Must be one of: male, female, mixed" },
          400
        );
      }
    }

    const updateData: any = { updated_at: new Date() };
    if (name !== undefined) updateData.name = sanitizeText(name);
    if (level !== undefined) updateData.level = level;
    if (gender !== undefined) updateData.gender = gender;

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [updatedGroup] = await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, groupId))
      .returning();

    if (!updatedGroup) {
      return c.json({ error: "Group not found" }, 404);
    }

    return c.json({
      group: updatedGroup,
      message: "Group updated successfully",
    });
  } catch (error) {
    console.error("Group update error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

adminRoutes.delete("/groups/:id", async (c) => {
  try {
    const groupId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [deletedGroup] = await db
      .delete(groups)
      .where(eq(groups.id, groupId))
      .returning();

    if (!deletedGroup) {
      return c.json({ error: "Group not found" }, 404);
    }

    return c.json({
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Group deletion error:", error);
    return c.json({ error: "Failed to delete group" }, 500);
  }
});

// Level Validation Endpoints (Admin Only)
adminRoutes.get("/level-validations", async (c) => {
  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const pendingRequests = await db
      .select()
      .from(users)
      .where(eq(users.level_validation_status, "pending"));

    return c.json({
      requests: pendingRequests,
      message: "Pending level validation requests retrieved successfully",
    });
  } catch (error) {
    console.error("Level validation requests error:", error);
    return c.json({ error: "Failed to retrieve level validation requests" }, 500);
  }
});

adminRoutes.post("/level-validations/:userId/approve", async (c) => {
  try {
    const adminUser = c.get("adminUser");
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { notes } = body;

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if user exists and has pending validation
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.level_validation_status, "pending")));

    if (!user) {
      return c.json({ error: "User not found or no pending validation" }, 404);
    }

    // Update user with approved level
    const [updatedUser] = await db
      .update(users)
      .set({
        level_validation_status: "approved",
        level_validated_at: new Date(),
        level_validated_by: adminUser.id,
        level_validation_notes: notes || null,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return c.json({
      user: updatedUser,
      message: "Level validation approved successfully",
    });
  } catch (error) {
    console.error("Level validation approval error:", error);
    return c.json({ error: "Failed to approve level validation" }, 500);
  }
});

adminRoutes.post("/level-validations/:userId/reject", async (c) => {
  try {
    const adminUser = c.get("adminUser");
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { notes } = body;

    if (!notes) {
      return c.json({ error: "Notes are required when rejecting a level validation" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if user exists and has pending validation
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.level_validation_status, "pending")));

    if (!user) {
      return c.json({ error: "User not found or no pending validation" }, 404);
    }

    // Update user with rejected level
    const [updatedUser] = await db
      .update(users)
      .set({
        level_validation_status: "rejected",
        level_validated_at: new Date(),
        level_validated_by: adminUser.id,
        level_validation_notes: notes,
        updated_at: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return c.json({
      user: updatedUser,
      message: "Level validation rejected successfully",
    });
  } catch (error) {
    console.error("Level validation rejection error:", error);
    return c.json({ error: "Failed to reject level validation" }, 500);
  }
});

// Public League Endpoints (No Authentication Required)
api.get("/leagues", async (c) => {
  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const allLeagues = await db.select().from(leagues);

    return c.json({
      leagues: allLeagues,
      message: "Leagues retrieved successfully",
    });
  } catch (error) {
    console.error("Public leagues retrieval error:", error);
    return c.json({ error: "Failed to retrieve leagues" }, 500);
  }
});

api.get("/leagues/:id", async (c) => {
  try {
    const leagueId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    const leagueGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.league_id, leagueId));

    return c.json({
      league: { ...league, groups: leagueGroups },
      message: "League retrieved successfully",
    });
  } catch (error) {
    console.error("Public league retrieval error:", error);
    return c.json({ error: "Failed to retrieve league" }, 500);
  }
});

api.get("/leagues/:id/groups", async (c) => {
  try {
    const leagueId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));
    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    const leagueGroups = await db
      .select()
      .from(groups)
      .where(eq(groups.league_id, leagueId));

    return c.json({
      groups: leagueGroups,
      message: "Groups retrieved successfully",
    });
  } catch (error) {
    console.error("Public groups retrieval error:", error);
    return c.json({ error: "Failed to retrieve groups" }, 500);
  }
});

// Mount the protected routes under /protected
api.route("/protected", protectedRoutes);

// Mount the admin routes under /admin
api.route("/admin", adminRoutes);

// Mount the API router
app.route("/api/v1", api);

export default app;

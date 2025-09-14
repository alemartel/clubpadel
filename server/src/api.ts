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
  matches,
  type NewLeague,
  type NewGroup,
  type NewMatch,
} from "./schema/leagues";
import {
  teams,
  team_members,
  team_availability,
  type NewTeam,
  type NewTeamMember,
  type NewTeamAvailability,
} from "./schema/teams";
import { eq, and, or, ne, sql, notInArray, desc, inArray } from "drizzle-orm";
import { CalendarGenerator } from "./lib/calendar-generator";

type Env = {
  RUNTIME?: string;
  [key: string]: any;
};

// Helper function to create standardized error responses
function createErrorResponse(message: string, status: number = 500, details?: string) {
  return {
    error: message,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
}

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
    if (error.constraint === "teams_league_name_unique") {
      return {
        message: "Team name must be unique within the league",
        status: 409,
      };
    }
    if (error.constraint === "team_members_team_user_unique") {
      return {
        message: "User is already a member of this team",
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

// Profile picture update endpoint
protectedRoutes.put("/profile/picture", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();

    const { imageUrl } = body;

    // Validate imageUrl
    if (!imageUrl || typeof imageUrl !== "string") {
      return c.json({ error: "Valid image URL is required" }, 400);
    }

    // Validate that it's a Cloudinary URL
    if (!imageUrl.includes("cloudinary.com")) {
      return c.json({ error: "Invalid image URL. Must be a Cloudinary URL." }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [updatedUser] = await db
      .update(users)
      .set({
        profile_picture_url: imageUrl,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return c.json({
      user: updatedUser,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    console.error("Profile picture update error:", error);
    return c.json({ error: "Failed to update profile picture" }, 500);
  }
});

// Profile picture removal endpoint
protectedRoutes.delete("/profile/picture", async (c) => {
  try {
    const user = c.get("user");

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [updatedUser] = await db
      .update(users)
      .set({
        profile_picture_url: null,
        updated_at: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();

    return c.json({
      user: updatedUser,
      message: "Profile picture removed successfully",
    });
  } catch (error) {
    console.error("Profile picture removal error:", error);
    return c.json({ error: "Failed to remove profile picture" }, 500);
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

    // Check if user exists and has pending or rejected validation
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, userId), 
        or(
          eq(users.level_validation_status, "pending"),
          eq(users.level_validation_status, "rejected")
        )
      ));

    if (!user) {
      return c.json({ error: "User not found or no validation request to approve" }, 404);
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

// Admin Player Management Endpoints
adminRoutes.get("/players", async (c) => {
  try {
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get all players with their validation status
    const allPlayers = await db
      .select({
        id: users.id,
        email: users.email,
        first_name: users.first_name,
        last_name: users.last_name,
        display_name: users.display_name,
        phone_number: users.phone_number,
        role: users.role,
        claimed_level: users.claimed_level,
        level_validation_status: users.level_validation_status,
        level_validation_notes: users.level_validation_notes,
        level_validated_at: users.level_validated_at,
        level_validated_by: users.level_validated_by,
        created_at: users.created_at,
        updated_at: users.updated_at,
      })
      .from(users)
      .where(eq(users.role, "player"))
      .orderBy(desc(users.updated_at));

    return c.json({
      players: allPlayers,
      message: "Players retrieved successfully",
    });
  } catch (error) {
    console.error("Admin players retrieval error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Admin Team Management Endpoints
adminRoutes.get("/groups/:groupId/teams", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get all teams in this group with creator information
    const groupTeams = await db
      .select({
        team: teams,
        league: leagues,
        group: groups,
        creator: {
          id: users.id,
          email: users.email,
          first_name: users.first_name,
          last_name: users.last_name,
          display_name: users.display_name,
        },
        member_count: sql<number>`(
          SELECT COUNT(*) 
          FROM ${team_members} tm 
          INNER JOIN ${users} u ON tm.user_id = u.id
          WHERE tm.team_id = ${teams.id}
        )`,
      })
      .from(teams)
      .innerJoin(leagues, eq(teams.league_id, leagues.id))
      .innerJoin(groups, eq(teams.group_id, groups.id))
      .innerJoin(users, eq(teams.created_by, users.id))
      .where(eq(teams.group_id, groupId));

    return c.json({
      teams: groupTeams,
      message: "Teams retrieved successfully",
    });
  } catch (error) {
    console.error("Admin teams retrieval error:", error);
    return c.json({ error: "Failed to retrieve teams" }, 500);
  }
});

// Team Management Endpoints
protectedRoutes.post("/teams", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { name, league_id, group_id } = body;

    // Sanitize and validate required fields
    const sanitizedName = sanitizeText(name);
    if (!sanitizedName || !league_id || !group_id) {
      return c.json({ error: "Team name, league, and group are required" }, 400);
    }

    // Check if user has validated level
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!currentUser || currentUser.level_validation_status !== "approved") {
      return c.json({ error: "You must have a validated level to create teams" }, 403);
    }

    // Verify league and group exist
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, league_id));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, group_id), eq(groups.league_id, league_id)));

    if (!group) {
      return c.json({ error: "Group not found in this league" }, 404);
    }

    // Check if user's validated level matches group level
    if (currentUser.claimed_level !== group.level) {
      return c.json({ error: "Your validated level must match the group level" }, 400);
    }

    // Check if team name is unique within league
    const [existingTeam] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.league_id, league_id), eq(teams.name, sanitizedName)));

    if (existingTeam) {
      return c.json({ error: "Team name must be unique within the league" }, 409);
    }

    // Create team
    const teamId = randomUUID();
    const [newTeam] = await db
      .insert(teams)
      .values({
        id: teamId,
        name: sanitizedName,
        league_id,
        group_id,
        created_by: user.id,
      })
      .returning();

    // Add creator as team member
    await db
      .insert(team_members)
      .values({
        id: randomUUID(),
        team_id: teamId,
        user_id: user.id,
        role: "captain",
      });

    return c.json({
      team: newTeam,
      message: "Team created successfully",
    });
  } catch (error) {
    console.error("Team creation error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

protectedRoutes.get("/teams", async (c) => {
  try {
    const user = c.get("user");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get teams where user is a member
    const userTeams = await db
      .select({
        team: teams,
        league: leagues,
        group: groups,
        member_count: sql<number>`(
          SELECT COUNT(*) 
          FROM ${team_members} tm 
          INNER JOIN ${users} u ON tm.user_id = u.id
          WHERE tm.team_id = ${teams.id}
        )`,
      })
      .from(teams)
      .innerJoin(leagues, eq(teams.league_id, leagues.id))
      .innerJoin(groups, eq(teams.group_id, groups.id))
      .where(
        sql`${teams.id} IN (
          SELECT tm.team_id 
          FROM ${team_members} tm 
          WHERE tm.user_id = ${user.id}
        )`
      );

    return c.json({
      teams: userTeams,
      message: "Teams retrieved successfully",
    });
  } catch (error) {
    console.error("Teams retrieval error:", error);
    return c.json({ error: "Failed to retrieve teams" }, 500);
  }
});

protectedRoutes.get("/teams/:id", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get team details with members
    const [team] = await db
      .select({
        team: teams,
        league: leagues,
        group: groups,
      })
      .from(teams)
      .innerJoin(leagues, eq(teams.league_id, leagues.id))
      .innerJoin(groups, eq(teams.group_id, groups.id))
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Check if user is a member of this team or is an admin
    const [membership] = await db
      .select()
      .from(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, user.id)));

    // Allow access if user is a team member OR is an admin
    if (!membership && user.role !== "admin") {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    // Get team members
    const members = await db
      .select({
        member: team_members,
        user: users,
      })
      .from(team_members)
      .innerJoin(users, eq(team_members.user_id, users.id))
      .where(eq(team_members.team_id, teamId));

    return c.json({
      team: { ...team, members },
      message: "Team details retrieved successfully",
    });
  } catch (error) {
    console.error("Team details error:", error);
    return c.json({ error: "Failed to retrieve team details" }, 500);
  }
});

protectedRoutes.put("/teams/:id", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const body = await c.req.json();
    const { name } = body;

    const sanitizedName = sanitizeText(name);
    if (!sanitizedName) {
      return c.json({ error: "Team name is required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if team exists and user is the creator
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    if (team.created_by !== user.id) {
      return c.json({ error: "Only the team creator can update team details" }, 403);
    }

    // Check if new name is unique within league
    const [existingTeam] = await db
      .select()
      .from(teams)
      .where(and(eq(teams.league_id, team.league_id), eq(teams.name, sanitizedName), ne(teams.id, teamId)));

    if (existingTeam) {
      return c.json({ error: "Team name must be unique within the league" }, 409);
    }

    // Update team
    const [updatedTeam] = await db
      .update(teams)
      .set({
        name: sanitizedName,
        updated_at: new Date(),
      })
      .where(eq(teams.id, teamId))
      .returning();

    return c.json({
      team: updatedTeam,
      message: "Team updated successfully",
    });
  } catch (error) {
    console.error("Team update error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

protectedRoutes.delete("/teams/:id", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if team exists and user is the creator
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    if (team.created_by !== user.id) {
      return c.json({ error: "Only the team creator can delete the team" }, 403);
    }

    // Delete team (cascade will handle team_members)
    await db
      .delete(teams)
      .where(eq(teams.id, teamId));

    return c.json({
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Team deletion error:", error);
    return c.json({ error: "Failed to delete team" }, 500);
  }
});

protectedRoutes.post("/teams/:id/members", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const body = await c.req.json();
    const { user_id } = body;

    if (!user_id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if team exists and user is the creator
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    if (team.created_by !== user.id) {
      return c.json({ error: "Only the team creator can add members" }, 403);
    }

    // Get team's group to check level requirements
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, team.group_id));

    // Check if target user exists and has validated level
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user_id));

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    if (targetUser.level_validation_status !== "approved") {
      return c.json({ error: "User must have a validated level to join teams" }, 400);
    }

    if (targetUser.claimed_level !== group.level) {
      return c.json({ error: "User's validated level must match the team's level" }, 400);
    }

    // Check if user is already on a team in this league
    const [existingMembership] = await db
      .select()
      .from(team_members)
      .innerJoin(teams, eq(team_members.team_id, teams.id))
      .where(and(eq(team_members.user_id, user_id), eq(teams.league_id, team.league_id)));

    if (existingMembership) {
      return c.json({ error: "User is already on a team in this league" }, 409);
    }

    // Add member to team
    const [newMember] = await db
      .insert(team_members)
      .values({
        id: randomUUID(),
        team_id: teamId,
        user_id,
        role: "member",
      })
      .returning();

    return c.json({
      member: newMember,
      message: "Member added to team successfully",
    });
  } catch (error) {
    console.error("Add team member error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

protectedRoutes.delete("/teams/:id/members/:userId", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const userId = c.req.param("userId");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Check if user is team creator or the member being removed
    if (team.created_by !== user.id && userId !== user.id) {
      return c.json({ error: "You can only remove yourself or be the team creator" }, 403);
    }

    // Check if membership exists
    const [membership] = await db
      .select()
      .from(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, userId)));

    if (!membership) {
      return c.json({ error: "User is not a member of this team" }, 404);
    }

    // Remove member from team
    await db
      .delete(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, userId)));

    return c.json({
      message: "Member removed from team successfully",
    });
  } catch (error) {
    console.error("Remove team member error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Team Availability Endpoints
protectedRoutes.get("/teams/:id/availability", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Check if user is a member of this team or is an admin
    const [membership] = await db
      .select()
      .from(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, user.id)));

    if (!membership && user.role !== "admin") {
      return c.json({ error: "You are not a member of this team" }, 403);
    }

    // Get team availability
    const availability = await db
      .select()
      .from(team_availability)
      .where(eq(team_availability.team_id, teamId))
      .orderBy(team_availability.day_of_week);

    return c.json({
      availability,
      message: "Team availability retrieved successfully",
    });
  } catch (error) {
    console.error("Get team availability error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

protectedRoutes.put("/teams/:id/availability", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const { availability } = await c.req.json();
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Check if user is a team member
    const [membership] = await db
      .select()
      .from(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, user.id)));

    if (!membership) {
      return c.json({ error: "Only team members can update availability" }, 403);
    }

    // Validate availability data
    if (!Array.isArray(availability)) {
      return c.json({ error: "Availability must be an array" }, 400);
    }

    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const dayAvailability of availability) {
      if (!validDays.includes(dayAvailability.day_of_week)) {
        return c.json({ error: `Invalid day: ${dayAvailability.day_of_week}` }, 400);
      }
      
      if (dayAvailability.is_available && (!dayAvailability.start_time || !dayAvailability.end_time)) {
        return c.json({ error: "Start time and end time are required when available" }, 400);
      }
    }

    // Delete existing availability for this team
    await db
      .delete(team_availability)
      .where(eq(team_availability.team_id, teamId));

    // Insert new availability
    const newAvailability: NewTeamAvailability[] = availability.map((day: any) => ({
      id: randomUUID(),
      team_id: teamId,
      day_of_week: day.day_of_week,
      is_available: day.is_available || false,
      start_time: day.start_time || null,
      end_time: day.end_time || null,
    }));

    if (newAvailability.length > 0) {
      await db.insert(team_availability).values(newAvailability);
    }

    return c.json({
      message: "Team availability updated successfully",
    });
  } catch (error) {
    console.error("Update team availability error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

protectedRoutes.get("/players/free-market", async (c) => {
  try {
    const user = c.get("user");
    const { level, gender, league_id } = c.req.query();
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    if (!level) {
      return c.json({ error: "Level parameter is required" }, 400);
    }

    if (!league_id) {
      return c.json({ error: "League ID parameter is required" }, 400);
    }

    // Verify the league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, league_id));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    // Get all players who are already on teams in this league
    const leagueTeamMembers = await db
      .select({ user_id: team_members.user_id })
      .from(team_members)
      .innerJoin(teams, eq(team_members.team_id, teams.id))
      .where(eq(teams.league_id, league_id));

    const excludedUserIds = leagueTeamMembers.map(m => m.user_id);

    // Build query for available players (excluding those already on teams in this league)
    const availablePlayers = await db
      .select({
        user: users,
      })
      .from(users)
      .where(
        and(
          eq(users.level_validation_status, "approved"),
          eq(users.claimed_level, level as "1" | "2" | "3" | "4"),
          ne(users.id, user.id), // Exclude current user
          excludedUserIds.length > 0 ? notInArray(users.id, excludedUserIds) : undefined
        )
      );

    // Add gender filter if provided
    if (gender) {
      // Note: This assumes we'll add gender to users table in the future
      // For now, we'll just filter by level
    }

    return c.json({
      players: availablePlayers,
      message: "Available players retrieved successfully",
      totalAvailable: availablePlayers.length,
      league: {
        id: league.id,
        name: league.name
      }
    });
  } catch (error) {
    console.error("Free market players error:", error);
    return c.json({ error: "Failed to retrieve available players" }, 500);
  }
});

// Calendar Generation Endpoints (Admin Only)
adminRoutes.post("/groups/:groupId/generate-calendar", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    const body = await c.req.json();
    const { start_date } = body;

    if (!start_date) {
      return c.json({ error: "Start date is required" }, 400);
    }

    const startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return c.json({ error: "Invalid start date format" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get group and league info
    console.log(`Getting group info for groupId: ${groupId}`);
    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.id, groupId));

    if (!group) {
      console.log(`Group not found for groupId: ${groupId}`);
      return c.json({ error: "Group not found" }, 404);
    }

    console.log(`Found group:`, { id: group.id, name: group.name, league_id: group.league_id });

    if (!group.league_id) {
      console.error(`Group ${groupId} has no league_id`);
      return c.json({ error: "Group has no associated league" }, 400);
    }

    console.log(`Getting league info for leagueId: ${group.league_id}`);
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, group.league_id));

    if (!league) {
      console.log(`League not found for leagueId: ${group.league_id}`);
      return c.json({ error: "League not found" }, 404);
    }

    console.log(`Found league:`, { id: league.id, name: league.name });

    // Generate calendar
    console.log("Creating calendar generator and generating calendar");
    const generator = new CalendarGenerator(db);
    const result = await generator.generateCalendar(groupId, startDate);

    console.log(`Calendar generation completed. Saving ${result.matches.length} matches to database`);
    // Save matches to database
    await generator.saveMatches(result.matches, league.id, groupId);

    console.log("Updating league dates");
    // Update league dates
    await generator.updateLeagueDates(league.id, result.start_date, result.end_date);

    return c.json({
      matches: result.matches,
      total_weeks: result.total_weeks,
      start_date: result.start_date,
      end_date: result.end_date,
      message: "Calendar generated successfully",
    });
  } catch (error) {
    console.error("Calendar generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate calendar";
    return c.json(createErrorResponse(errorMessage, 500), 500);
  }
});

adminRoutes.get("/groups/:groupId/calendar", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    console.log(`Retrieving calendar for group: ${groupId}`);
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get all matches for the group first
    const groupMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.group_id, groupId))
      .orderBy(matches.week_number, matches.match_date);
    
    console.log(`Found ${groupMatches.length} matches for group ${groupId}`);

    // Get team details for all unique team IDs
    const teamIds = new Set<string>();
    groupMatches.forEach(match => {
      teamIds.add(match.home_team_id);
      teamIds.add(match.away_team_id);
    });

    const teamDetails = teamIds.size > 0 ? await db
      .select({
        id: teams.id,
        name: teams.name,
      })
      .from(teams)
      .where(inArray(teams.id, Array.from(teamIds))) : [];

    // Create a map for quick team lookup
    const teamMap = new Map(teamDetails.map(team => [team.id, team]));

    // Combine matches with team details
    const matchesWithTeams = groupMatches.map(match => ({
      match,
      home_team: teamMap.get(match.home_team_id) || { id: match.home_team_id, name: "Unknown Team" },
      away_team: teamMap.get(match.away_team_id) || { id: match.away_team_id, name: "Unknown Team" },
    }));

    return c.json({
      matches: matchesWithTeams,
      message: "Calendar retrieved successfully",
    });
  } catch (error) {
    console.error("Calendar retrieval error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      groupId: c.req.param("groupId")
    });
    return c.json(createErrorResponse("Failed to retrieve calendar", 500), 500);
  }
});

adminRoutes.put("/leagues/:id/dates", async (c) => {
  try {
    const leagueId = c.req.param("id");
    const body = await c.req.json();
    const { start_date, end_date } = body;

    if (!start_date || !end_date) {
      return c.json({ error: "Start date and end date are required" }, 400);
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return c.json({ error: "Invalid date format" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    await db
      .update(leagues)
      .set({
        start_date: startDate,
        end_date: endDate,
        updated_at: new Date(),
      })
      .where(eq(leagues.id, leagueId));

    return c.json({
      message: "League dates updated successfully",
    });
  } catch (error) {
    console.error("League dates update error:", error);
    return c.json(createErrorResponse("Failed to update league dates", 500), 500);
  }
});

// Clear calendar endpoint for testing
adminRoutes.delete("/groups/:groupId/calendar", async (c) => {
  try {
    const groupId = c.req.param("groupId");
    console.log(`Clearing calendar for group: ${groupId}`);
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Delete all matches for this group
    const deletedMatches = await db
      .delete(matches)
      .where(eq(matches.group_id, groupId));

    console.log(`Deleted matches for group ${groupId}`);

    return c.json({
      message: "Calendar cleared successfully",
    });
  } catch (error) {
    console.error("Calendar clear error:", error);
    return c.json(createErrorResponse("Failed to clear calendar", 500), 500);
  }
});

// Mount the protected routes under /protected
api.route("/protected", protectedRoutes);

// Mount the admin routes under /admin
api.route("/admin", adminRoutes);

// Mount the API router
app.route("/api/v1", api);

export default app;

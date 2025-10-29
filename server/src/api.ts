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
    const { first_name, last_name, phone_number, dni, tshirt_size, gender } = body;

    // Only update provided fields
    const updateData: any = { updated_at: new Date() };
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (dni !== undefined) updateData.dni = dni;
    if (tshirt_size !== undefined) updateData.tshirt_size = tshirt_size;
    if (gender !== undefined) {
      // Validate gender is one of: "male", "female", "mixed", or null
      if (gender !== null && !["male", "female", "mixed"].includes(gender)) {
        return c.json({ error: "Gender must be male, female, or mixed" }, 400);
      }
      updateData.gender = gender;
    }

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
    const { name, level, gender } = body;

    // Sanitize and validate required fields
    const sanitizedName = sanitizeText(name);
    if (!sanitizedName || !level || !gender) {
      return c.json({ error: "Team name, level, and gender are required" }, 400);
    }

    // Validate level is one of: "1", "2", "3", "4"
    if (!["1", "2", "3", "4"].includes(level)) {
      return c.json({ error: "Level must be 1, 2, 3, or 4" }, 400);
    }

    // Validate gender is one of: "male", "female", "mixed"
    if (!["male", "female", "mixed"].includes(gender)) {
      return c.json({ error: "Gender must be male, female, or mixed" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Validate creator's gender matches team gender requirement
    const [creator] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id));

    if (creator?.gender) {
      if (gender === "male" && creator.gender !== "male") {
        return c.json({ 
          error: "Masculine teams can only be created by male players" 
        }, 403);
      }
      if (gender === "female" && creator.gender !== "female") {
        return c.json({ 
          error: "Feminine teams can only be created by female players" 
        }, 403);
      }
    }

    // Check if team name is unique (globally since teams no longer require leagues)
    const [existingTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.name, sanitizedName));

    if (existingTeam) {
      return c.json({ error: "Team name must be unique" }, 409);
    }

    // Create team without league_id and group_id
    const teamId = randomUUID();
    const [newTeam] = await db
      .insert(teams)
      .values({
        id: teamId,
        name: sanitizedName,
        level: level as "1" | "2" | "3" | "4",
        gender: gender as "male" | "female" | "mixed",
        league_id: null,
        group_id: null,
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

    // Get teams where user is a member (using leftJoin for nullable league/group)
    const userTeams = await db
      .select({
        team: teams,
        league: {
          id: leagues.id,
          name: leagues.name,
          start_date: leagues.start_date,
          end_date: leagues.end_date,
        },
        group: {
          id: groups.id,
          name: groups.name,
          level: groups.level,
          gender: groups.gender,
        },
        member_count: sql<number>`(
          SELECT COUNT(*) 
          FROM ${team_members} tm 
          INNER JOIN ${users} u ON tm.user_id = u.id
          WHERE tm.team_id = ${teams.id}
        )`,
      })
      .from(teams)
      .leftJoin(leagues, eq(teams.league_id, leagues.id))
      .leftJoin(groups, eq(teams.group_id, groups.id))
      .where(
        sql`${teams.id} IN (
          SELECT tm.team_id 
          FROM ${team_members} tm 
          WHERE tm.user_id = ${user.id}
        )`
      );

    // Normalize null league/group to null in response
    const normalizedTeams = userTeams.map(t => ({
      ...t,
      league: t.league?.id ? t.league : null,
      group: t.group?.id ? t.group : null,
    }));

    return c.json({
      teams: normalizedTeams,
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

    // Get team details with optional league and group (using leftJoin for nullable foreign keys)
    const [teamData] = await db
      .select({
        team: teams,
        league: {
          id: leagues.id,
          name: leagues.name,
          start_date: leagues.start_date,
          end_date: leagues.end_date,
        },
        group: {
          id: groups.id,
          name: groups.name,
          level: groups.level,
          gender: groups.gender,
        },
      })
      .from(teams)
      .leftJoin(leagues, eq(teams.league_id, leagues.id))
      .leftJoin(groups, eq(teams.group_id, groups.id))
      .where(eq(teams.id, teamId));

    if (!teamData || !teamData.team) {
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

    // Get team members with user gender information
    const members = await db
      .select({
        member: team_members,
        user: {
          id: users.id,
          email: users.email,
          first_name: users.first_name,
          last_name: users.last_name,
          display_name: users.display_name,
          gender: users.gender,
        },
      })
      .from(team_members)
      .innerJoin(users, eq(team_members.user_id, users.id))
      .where(eq(team_members.team_id, teamId));

    return c.json({
      team: {
        team: teamData.team,
        league: teamData.league || null,
        group: teamData.group || null,
        members,
      },
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

    // Check if new name is unique (globally if no league, within league if league exists)
    if (team.league_id) {
      // If team has a league, check uniqueness within that league
      const [existingTeam] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.league_id, team.league_id), eq(teams.name, sanitizedName), ne(teams.id, teamId)));

      if (existingTeam) {
        return c.json({ error: "Team name must be unique within the league" }, 409);
      }
    } else {
      // If team has no league, check global uniqueness
      const [existingTeam] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.name, sanitizedName), ne(teams.id, teamId)));

      if (existingTeam) {
        return c.json({ error: "Team name must be unique" }, 409);
      }
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

    // Check if team has fewer than 4 members
    const existingMembers = await db
      .select()
      .from(team_members)
      .where(eq(team_members.team_id, teamId));

    if (existingMembers.length >= 4) {
      return c.json({ error: "Maximum number of players (4) reached" }, 400);
    }

    // Check if target user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user_id));

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check player is not an admin
    if (targetUser.role === "admin") {
      return c.json({ error: "Admins cannot be added to teams" }, 403);
    }

    // Validate gender compatibility
    if (!targetUser.gender) {
      return c.json({ error: "Player must have a gender set in their profile" }, 400);
    }

    if (team.gender === "male" && targetUser.gender !== "male") {
      return c.json({ error: "Masculine teams can only contain male players" }, 400);
    }

    if (team.gender === "female" && targetUser.gender !== "female") {
      return c.json({ error: "Feminine teams can only contain female players" }, 400);
    }

    // For mixed teams, validate both genders when reaching 4 members
    if (team.gender === "mixed") {
      if (existingMembers.length === 3) {
        // Get genders of current members
        const memberGenders = await db
          .select({ gender: users.gender })
          .from(users)
          .innerJoin(team_members, eq(users.id, team_members.user_id))
          .where(eq(team_members.team_id, teamId));

        const maleCount = memberGenders.filter(m => m.gender === "male").length;
        const femaleCount = memberGenders.filter(m => m.gender === "female").length;

        // Calculate new counts after adding this player
        const newMaleCount = targetUser.gender === "male" ? maleCount + 1 : maleCount;
        const newFemaleCount = targetUser.gender === "female" ? femaleCount + 1 : femaleCount;

        // Mixed teams must have at least one of each gender when full
        if (newMaleCount === 0 || newFemaleCount === 0) {
          return c.json({ 
            error: "Mixed teams must contain both masculine and feminine players" 
          }, 400);
        }
      }
    }

    // Check if user is already on another team with the same level AND gender combination
    const existingMemberships = await db
      .select({
        team_id: teams.id,
        team_level: teams.level,
        team_gender: teams.gender,
        team_name: teams.name,
      })
      .from(team_members)
      .innerJoin(teams, eq(team_members.team_id, teams.id))
      .where(eq(team_members.user_id, user_id));

    // Check if user is already on a team with the same level and gender
    const conflictingTeam = existingMemberships.find(
      (membership) => membership.team_level === team.level && membership.team_gender === team.gender
    );

    if (conflictingTeam) {
      return c.json({ 
        error: `Player is already on a Level ${team.level} ${team.gender === 'male' ? 'masculine' : team.gender === 'female' ? 'feminine' : 'mixed'} team (${conflictingTeam.team_name})` 
      }, 409);
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

    // league_id is now optional (for backwards compatibility)
    let excludedUserIds: string[] = [];

    if (league_id) {
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

      excludedUserIds = leagueTeamMembers.map(m => m.user_id);
    } else {
      // If no league_id, exclude users who are on a team with the same level AND gender
      // This allows players to be on teams with different level/gender combinations
      if (level && gender) {
        // Validate level and gender are valid enum values
        const validLevels = ["1", "2", "3", "4"];
        const validGenders = ["male", "female", "mixed"];
        
        if (validLevels.includes(level) && validGenders.includes(gender)) {
          const conflictingTeamMembers = await db
            .select({ user_id: team_members.user_id })
            .from(team_members)
            .innerJoin(teams, eq(team_members.team_id, teams.id))
            .where(
              and(
                eq(teams.level, level as "1" | "2" | "3" | "4"),
                eq(teams.gender, gender as "male" | "female" | "mixed")
              )
            );

          excludedUserIds = conflictingTeamMembers.map(m => m.user_id);
        } else {
          // Invalid level or gender, fall back to excluding all team members
          const allTeamMembers = await db
            .select({ user_id: team_members.user_id })
            .from(team_members);

          excludedUserIds = allTeamMembers.map(m => m.user_id);
        }
      } else {
        // If level or gender not provided, fall back to excluding all team members
        // (for backwards compatibility or edge cases)
        const allTeamMembers = await db
          .select({ user_id: team_members.user_id })
          .from(team_members);

        excludedUserIds = allTeamMembers.map(m => m.user_id);
      }
    }

    // Build base query conditions
    const conditions = [
      ne(users.id, user.id), // Exclude current user
      eq(users.role, "player"), // Exclude admins
      excludedUserIds.length > 0 ? notInArray(users.id, excludedUserIds) : undefined
    ];

    // Filter by gender if provided
    if (gender) {
      if (gender === "male") {
        conditions.push(eq(users.gender, "male"));
      } else if (gender === "female") {
        conditions.push(eq(users.gender, "female"));
      } else if (gender === "mixed") {
        // Mixed teams can have both male and female players
        conditions.push(
          or(
            eq(users.gender, "male"),
            eq(users.gender, "female")
          )
        );
      }
    }

    // Build query for available players
    const availablePlayers = await db
      .select({
        user: users,
      })
      .from(users)
      .where(and(...conditions.filter(c => c !== undefined)));

    const responseData: any = {
      players: availablePlayers,
      message: "Available players retrieved successfully",
      totalAvailable: availablePlayers.length,
    };

    // Only include league info if league_id was provided and league exists
    if (league_id) {
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, league_id));
      
      if (league) {
        responseData.league = {
          id: league.id,
          name: league.name
        };
      }
    }

    return c.json(responseData);
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

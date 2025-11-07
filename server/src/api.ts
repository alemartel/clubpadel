import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { randomUUID, randomBytes } from "crypto";
import { authMiddleware } from "./middleware/auth";
import { adminMiddleware } from "./middleware/admin";
import { getDatabase, testDatabaseConnection } from "./lib/db";
import { setEnvContext, clearEnvContext, getDatabaseUrl } from "./lib/env";
import * as schema from "./schema/users";
import { users, levelEnum } from "./schema/users";
import {
  leagues,
  matches,
  bye_weeks,
  type NewLeague,
  type NewMatch,
} from "./schema/leagues";
import {
  teams,
  team_members,
  team_availability,
  team_change_notifications,
  team_leagues,
  league_payments,
  type NewTeam,
  type NewTeamMember,
  type NewTeamAvailability,
  type NewTeamChangeNotification,
  type NewTeamLeague,
  type NewLeaguePayment,
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

// Helper function to calculate league status
function getLeagueStatus(league: { start_date: Date | null; end_date: Date | null }): "not_started" | "in_progress" | "completed" {
  const now = new Date();
  
  // If no dates set, consider as not started
  if (!league.start_date || !league.end_date) {
    return "not_started";
  }
  
  const startDate = new Date(league.start_date);
  const endDate = new Date(league.end_date);
  
  if (startDate > now) {
    return "not_started";
  }
  if (startDate <= now && endDate >= now) {
    return "in_progress";
  }
  return "completed";
}

// Helper function to generate a random 6-character alphanumeric passcode
function generatePasscode(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let passcode = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    passcode += charset[bytes[i] % 36];
  }
  return passcode;
}

// Helper function to generate a unique passcode (checks database for collisions)
async function generateUniquePasscode(db: any): Promise<string> {
  let passcode: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    passcode = generatePasscode();
    const [existing] = await db
      .select()
      .from(teams)
      .where(eq(teams.passcode, passcode));
    
    if (!existing) {
      return passcode;
    }
    
    attempts++;
    if (attempts > maxAttempts) {
      throw new Error("Failed to generate unique passcode after 100 attempts");
    }
  } while (true);
}

// Helper function to handle database constraint errors
function handleDatabaseError(error: any): { message: string; status: number } {
  if (error.code === "23505") {
    // Unique constraint violation
    if (error.constraint === "teams_league_name_unique") {
      return {
        message: "Team name must be unique within the league",
        status: 409,
      };
    }
    if (error.constraint === "teams_name_unique") {
      return {
        message: "Team name must be unique",
        status: 409,
      };
    }
    if (error.constraint === "team_members_team_user_unique") {
      return {
        message: "User is already a member of this team",
        status: 409,
      };
    }
    if (error.constraint === "teams_passcode_unique") {
      return {
        message: "Passcode already exists. Please try again.",
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

    console.log(`[db-test] Attempting to connect to database: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

    const db = await getDatabase(dbUrl);
    console.log("[db-test] Database connection established");

    const isHealthy = await testDatabaseConnection();
    console.log(`[db-test] Connection health check: ${isHealthy}`);

    if (!isHealthy) {
      return c.json(
        {
          error: "Database connection is not healthy",
          databaseUrl: dbUrl.replace(/:[^:@]+@/, ':****@'),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }

    console.log("[db-test] Querying users table...");
    const result = await db.select().from(schema.users).limit(5);
    console.log(`[db-test] Query successful, found ${result.length} users`);

    return c.json({
      message: "Database connection successful!",
      users: result,
      connectionHealthy: isHealthy,
      usingLocalDatabase: !getDatabaseUrl(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database test error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Provide more helpful error messages
    let helpfulMessage = errorMessage;
    if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("connection refused")) {
      helpfulMessage = `Database server is not running. Please ensure the database server is started (check if 'pnpm dev' is running). Original error: ${errorMessage}`;
    } else if (errorMessage.includes("does not exist") || errorMessage.includes("relation") || errorMessage.includes("schema")) {
      helpfulMessage = `Database schema not initialized. Please run 'cd server && pnpm db:push' to create the schema. Original error: ${errorMessage}`;
    }

    return c.json(
      {
        error: "Database connection failed",
        details: helpfulMessage,
        originalError: errorMessage,
        stack: errorStack,
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

    const { name, start_date, end_date, level, gender } = body;

    // Validate required fields
    if (!name || !start_date || !end_date || !level || !gender) {
      return c.json(
        { error: "Missing required fields: name, start_date, end_date, level, gender" },
        400
      );
    }

    // Sanitize text inputs
    const sanitizedName = sanitizeText(name);

    // Validate level is one of: "2", "3", "4"
    if (!["2", "3", "4"].includes(level)) {
      return c.json({ error: "Level must be 2, 3, or 4" }, 400);
    }

    // Validate gender is one of: "male", "female", "mixed"
    if (!["male", "female", "mixed"].includes(gender)) {
      return c.json({ error: "Gender must be male, female, or mixed" }, 400);
    }

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
      level: level as any,
      gender: gender as any,
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

    return c.json({
      league: league,
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

    const { name, start_date, end_date, level, gender } = body;

    // Validate date logic if dates are provided
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        return c.json({ error: "Start date must be before end date" }, 400);
      }
    }

    // Validate level if provided
    if (level !== undefined && !["2", "3", "4"].includes(level)) {
      return c.json({ error: "Level must be 2, 3, or 4" }, 400);
    }

    // Validate gender if provided
    if (gender !== undefined && !["male", "female", "mixed"].includes(gender)) {
      return c.json({ error: "Gender must be male, female, or mixed" }, 400);
    }

    const updateData: any = { updated_at: new Date() };
    if (name !== undefined) updateData.name = sanitizeText(name);
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.end_date = new Date(end_date);
    if (level !== undefined) updateData.level = level as any;
    if (gender !== undefined) updateData.gender = gender as any;

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

    // Check if league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    // Delete all matches associated with this league
    await db
      .delete(matches)
      .where(eq(matches.league_id, leagueId));

    // Remove all team-league associations for this league
    await db
      .delete(team_leagues)
      .where(eq(team_leagues.league_id, leagueId));

    // Update teams.league_id to null for teams that were pointing to this league
    await db
      .update(teams)
      .set({
        league_id: null,
        updated_at: new Date(),
      })
      .where(eq(teams.league_id, leagueId));

    // Delete the league
    const [deletedLeague] = await db
      .delete(leagues)
      .where(eq(leagues.id, leagueId))
      .returning();

    return c.json({
      message: "League deleted successfully",
    });
  } catch (error) {
    console.error("League deletion error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Admin: List all teams with members, filters by gender/level
adminRoutes.get("/teams", async (c) => {
  try {
    const { gender, level } = c.req.query();
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Build base team conditions
    const teamConditions: any[] = [];
    if (gender) {
      teamConditions.push(eq(teams.gender, gender as any));
    }
    if (level) {
      teamConditions.push(eq(teams.level, level as any));
    }

    // Fetch teams
    const teamRows = await db
      .select()
      .from(teams)
      .where(teamConditions.length ? and(...teamConditions) : undefined);

    if (teamRows.length === 0) {
      return c.json({ teams: [], total: 0 });
    }

    const teamIds = teamRows.map((t) => t.id);

    // Fetch members with user info
    // Use leftJoin to include all members even if user doesn't exist (data integrity issue)
    const memberRows = await db
      .select({
        member: team_members,
        user: users,
      })
      .from(team_members)
      .leftJoin(users, eq(team_members.user_id, users.id))
      .where(inArray(team_members.team_id, teamIds));

    // Log members with missing users for debugging
    const membersWithMissingUsers = memberRows.filter(row => !row.user || !row.user.id);
    if (membersWithMissingUsers.length > 0) {
      console.log(`[Admin GET /teams] Found ${membersWithMissingUsers.length} members with missing users`);
      membersWithMissingUsers.forEach(row => {
        console.warn(`[Admin GET /teams] Member ${row.member.id} has missing user: user_id=${row.member.user_id}`);
      });
    }

    // Group members by team
    const teamIdToMembers: Record<string, any[]> = {};
    for (const row of memberRows) {
      const list = teamIdToMembers[row.member.team_id] || [];
      list.push({ member: row.member, user: row.user });
      teamIdToMembers[row.member.team_id] = list;
    }

    // Fetch availability for all teams
    const availabilityRows = await db
      .select()
      .from(team_availability)
      .where(inArray(team_availability.team_id, teamIds))
      .orderBy(team_availability.day_of_week);

    // Group availability by team
    const teamIdToAvailability: Record<string, any[]> = {};
    for (const row of availabilityRows) {
      const list = teamIdToAvailability[row.team_id] || [];
      list.push({
        day_of_week: row.day_of_week,
        is_available: row.is_available,
        start_time: row.start_time,
        end_time: row.end_time,
      });
      teamIdToAvailability[row.team_id] = list;
    }

    // Shape response
    const response = teamRows.map((t) => ({
      team: {
        ...t,
        availability: teamIdToAvailability[t.id] || [],
      },
      league: null,
      group: null,
      members: teamIdToMembers[t.id] || [],
    }));

    return c.json({ teams: response, total: response.length });
  } catch (error) {
    console.error("Admin list teams error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Admin: Update member paid status/date/amount (per league)
adminRoutes.post("/teams/:teamId/members/:userId/paid", async (c) => {
  try {
    const teamId = c.req.param("teamId");
    const userId = c.req.param("userId");
    const body = await c.req.json();
    const { paid, paid_at, paid_amount, league_id } = body as { paid: boolean; paid_at?: string; paid_amount?: number; league_id?: string };

    if (typeof paid !== "boolean") {
      return c.json({ error: "'paid' boolean is required" }, 400);
    }

    if (!league_id) {
      return c.json({ error: "'league_id' is required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Verify membership exists
    const [membership] = await db
      .select()
      .from(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, userId)));

    if (!membership) {
      return c.json({ error: "Team membership not found" }, 404);
    }

    // Verify team is in the specified league
    const [teamLeague] = await db
      .select()
      .from(team_leagues)
      .where(and(eq(team_leagues.team_id, teamId), eq(team_leagues.league_id, league_id)));

    if (!teamLeague) {
      return c.json({ error: "Team is not in the specified league" }, 404);
    }

    // Check if payment record exists
    const [existingPayment] = await db
      .select()
      .from(league_payments)
      .where(
        and(
          eq(league_payments.user_id, userId),
          eq(league_payments.team_id, teamId),
          eq(league_payments.league_id, league_id)
        )
      );

    // Compute update values
    const updateValues: any = {
      paid,
      updated_at: new Date(),
    };
    if (paid) {
      updateValues.paid_at = paid_at ? new Date(paid_at) : new Date();
      updateValues.paid_amount = typeof paid_amount === "number" ? paid_amount : 0;
    } else {
      updateValues.paid_at = null;
      updateValues.paid_amount = null;
    }

    let result;
    if (existingPayment) {
      // Update existing payment record
      result = await db
        .update(league_payments)
        .set(updateValues)
        .where(
          and(
            eq(league_payments.user_id, userId),
            eq(league_payments.team_id, teamId),
            eq(league_payments.league_id, league_id)
          )
        )
        .returning();
    } else {
      // Create new payment record
      const paymentId = randomUUID();
      result = await db
        .insert(league_payments)
        .values({
          id: paymentId,
          user_id: userId,
          team_id: teamId,
          league_id: league_id,
          ...updateValues,
          created_at: new Date(),
        })
        .returning();
    }

    return c.json({ payment: result[0] });
  } catch (error) {
    console.error("Admin update paid status error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
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

    return c.json({
      league: league,
      message: "League retrieved successfully",
    });
  } catch (error) {
    console.error("Public league retrieval error:", error);
    return c.json({ error: "Failed to retrieve league" }, 500);
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
        profile_picture_url: users.profile_picture_url,
        dni: users.dni,
        tshirt_size: users.tshirt_size,
        gender: users.gender,
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

// Admin: Get all teams and leagues for a specific player
adminRoutes.get("/players/:playerId/teams", async (c) => {
  try {
    const playerId = c.req.param("playerId");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get all team memberships for this player with team and league information
    // Use team_leagues to get all leagues for each team
    const playerTeams = await db
      .select({
        team_member_id: team_members.id,
        team: teams,
        league: {
          id: leagues.id,
          name: leagues.name,
          start_date: leagues.start_date,
          end_date: leagues.end_date,
          level: leagues.level,
          gender: leagues.gender,
        },
      })
      .from(team_members)
      .innerJoin(teams, eq(team_members.team_id, teams.id))
      .leftJoin(team_leagues, eq(team_members.team_id, team_leagues.team_id))
      .leftJoin(leagues, eq(team_leagues.league_id, leagues.id))
      .where(eq(team_members.user_id, playerId))
      .orderBy(
        sql`CASE 
          WHEN ${leagues.start_date} IS NULL OR ${leagues.end_date} IS NULL THEN 3
          WHEN ${leagues.start_date} > NOW() THEN 2
          WHEN ${leagues.start_date} <= NOW() AND ${leagues.end_date} >= NOW() THEN 1
          ELSE 3
        END`,
        sql`${leagues.start_date} DESC NULLS LAST`
      );

    // Get payment status for each team-league combination
    const teamLeagueIds = playerTeams
      .filter(row => row.league?.id)
      .map(row => ({ teamId: row.team.id, leagueId: row.league!.id }));
    
    // Fetch payments for all team-league combinations
    const payments = teamLeagueIds.length > 0
      ? (await Promise.all(
          teamLeagueIds.map(async ({ teamId, leagueId }) => {
            const results = await db
              .select()
              .from(league_payments)
              .where(
                and(
                  eq(league_payments.user_id, playerId),
                  eq(league_payments.team_id, teamId),
                  eq(league_payments.league_id, leagueId)
                )
              );
            return results[0] || null;
          })
        )).filter(Boolean)
      : [];

    // Create a map of (team_id, league_id) -> payment
    const paymentMap = new Map(
      payments.map(p => [`${p.team_id}:${p.league_id}`, p])
    );

    // Shape response
    const response = playerTeams.map((row) => {
      const paymentKey = row.league?.id ? `${row.team.id}:${row.league.id}` : null;
      const payment = paymentKey ? paymentMap.get(paymentKey) : null;
      
      return {
        team: row.team,
        league: row.league?.id ? row.league : null,
        payment_status: payment ? {
          paid: payment.paid,
          paid_at: payment.paid_at ? payment.paid_at.toISOString() : null,
          paid_amount: payment.paid_amount ? parseFloat(payment.paid_amount) : null,
        } : {
          paid: false,
          paid_at: null,
          paid_amount: null,
        },
        team_member_id: row.team_member_id,
      };
    });

    return c.json({
      teams: response,
      message: "Player teams retrieved successfully",
    });
  } catch (error) {
    console.error("Admin player teams retrieval error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Admin Team Management Endpoints
adminRoutes.get("/leagues/:leagueId/teams", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get all teams in this league using team_leagues junction table
    const leagueTeams = await db
      .select({
        team: teams,
        league: leagues,
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
      .from(team_leagues)
      .innerJoin(teams, eq(team_leagues.team_id, teams.id))
      .innerJoin(leagues, eq(team_leagues.league_id, leagues.id))
      .innerJoin(users, eq(teams.created_by, users.id))
      .where(eq(team_leagues.league_id, leagueId));

    if (leagueTeams.length === 0) {
      return c.json({
        teams: [],
        message: "Teams retrieved successfully",
      });
    }

    const teamIds = leagueTeams.map((t) => t.team.id);

    // Fetch members with user info
    // Use leftJoin to include all members even if user doesn't exist (data integrity issue)
    const memberRows = await db
      .select({
        member: team_members,
        user: users,
      })
      .from(team_members)
      .leftJoin(users, eq(team_members.user_id, users.id))
      .where(inArray(team_members.team_id, teamIds));

    // Get payment status for all members in this league
    const userIds = memberRows.map(row => row.member.user_id).filter(Boolean);
    const payments = userIds.length > 0
      ? await db
          .select()
          .from(league_payments)
          .where(
            and(
              eq(league_payments.league_id, leagueId),
              inArray(league_payments.user_id, userIds),
              inArray(league_payments.team_id, teamIds)
            )
          )
      : [];

    // Create a map of (user_id, team_id) -> payment
    const paymentMap = new Map(
      payments.map(p => [`${p.user_id}:${p.team_id}`, p])
    );

    // Group members by team and add payment status
    const teamIdToMembers: Record<string, any[]> = {};
    for (const row of memberRows) {
      const list = teamIdToMembers[row.member.team_id] || [];
      const paymentKey = row.member.user_id ? `${row.member.user_id}:${row.member.team_id}` : null;
      const payment = paymentKey ? paymentMap.get(paymentKey) : null;
      
      // Add payment info to member object
      const memberWithPayment = {
        ...row.member,
        paid: payment?.paid ?? false,
        paid_at: payment?.paid_at ?? null,
        paid_amount: payment?.paid_amount ?? null,
      };
      
      list.push({ member: memberWithPayment, user: row.user });
      teamIdToMembers[row.member.team_id] = list;
    }

    // Shape response with members
    const response = leagueTeams.map((t) => ({
      team: t.team,
      league: t.league,
      creator: t.creator,
      member_count: t.member_count,
      members: teamIdToMembers[t.team.id] || [],
    }));

    return c.json({
      teams: response,
      message: "Teams retrieved successfully",
    });
  } catch (error) {
    console.error("Admin teams retrieval error:", error);
    return c.json({ error: "Failed to retrieve teams" }, 500);
  }
});

// Add team to league
adminRoutes.post("/leagues/:leagueId/teams", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    const body = await c.req.json();
    const { team_id } = body;

    if (!team_id) {
      return c.json({ error: "Team ID is required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    // Check team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, team_id));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Validate team level matches league level
    if (team.level !== league.level) {
      return c.json(
        {
          error: `Team level (${team.level}) does not match league level (${league.level})`,
        },
        400
      );
    }

    // Validate team gender matches league gender
    if (team.gender !== league.gender) {
      return c.json(
        {
          error: `Team gender (${team.gender}) does not match league gender (${league.gender})`,
        },
        400
      );
    }

    // Check if team is already in this league
    const [existingAssociation] = await db
      .select()
      .from(team_leagues)
      .where(and(eq(team_leagues.team_id, team_id), eq(team_leagues.league_id, leagueId)));

    if (existingAssociation) {
      return c.json(
        {
          error: "Team is already in this league",
        },
        409
      );
    }

    // Check if team is already in an active league (not started or in progress)
    // Only block if the target league is also active (not completed)
    const targetLeagueStatus = getLeagueStatus(league);
    if (targetLeagueStatus !== "completed") {
      // Get all leagues this team is currently in
      const teamLeagues = await db
        .select({
          league: leagues,
        })
        .from(team_leagues)
        .innerJoin(leagues, eq(team_leagues.league_id, leagues.id))
        .where(eq(team_leagues.team_id, team_id));

      // Check if team is in any active league
      for (const { league: currentLeague } of teamLeagues) {
        const status = getLeagueStatus(currentLeague);
        if (status === "not_started" || status === "in_progress") {
          return c.json(
            {
              error: `Team is already in an active league: "${currentLeague.name}"`,
            },
            409
          );
        }
      }
    }

    // Add team to league using team_leagues junction table
    const teamLeagueId = randomUUID();
    await db
      .insert(team_leagues)
      .values({
        id: teamLeagueId,
        team_id: team_id,
        league_id: leagueId,
      });

    // Also update teams.league_id for backward compatibility (set to most recent or active league)
    // Update teams.league_id to point to this league if target is active, or keep current if it's active
    const targetIsActive = targetLeagueStatus === "not_started" || targetLeagueStatus === "in_progress";
    if (targetIsActive) {
      await db
        .update(teams)
        .set({
          league_id: leagueId,
          updated_at: new Date(),
        })
        .where(eq(teams.id, team_id));
    }

    return c.json(
      {
        team: team,
        message: "Team added to league successfully",
      },
      200
    );
  } catch (error) {
    console.error("Add team to league error:", error);
    return c.json({ error: "Failed to add team to league" }, 500);
  }
});

// Remove team from league
adminRoutes.delete("/leagues/:leagueId/teams/:teamId", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    const teamId = c.req.param("teamId");

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check league exists
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    // Check team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Check if team is assigned to this league
    const [teamLeague] = await db
      .select()
      .from(team_leagues)
      .where(and(eq(team_leagues.team_id, teamId), eq(team_leagues.league_id, leagueId)));

    if (!teamLeague) {
      return c.json(
        { error: "Team is not assigned to this league" },
        404
      );
    }

    // Remove team from league using team_leagues junction table
    await db
      .delete(team_leagues)
      .where(and(eq(team_leagues.team_id, teamId), eq(team_leagues.league_id, leagueId)));

    // Update teams.league_id if it was pointing to this league
    // Find another league for this team, or set to null
    if (team.league_id === leagueId) {
      const [otherLeague] = await db
        .select()
        .from(team_leagues)
        .innerJoin(leagues, eq(team_leagues.league_id, leagues.id))
        .where(eq(team_leagues.team_id, teamId))
        .orderBy(desc(leagues.created_at))
        .limit(1);

      const newLeagueId = otherLeague?.league?.id || null;
      await db
        .update(teams)
        .set({
          league_id: newLeagueId,
          updated_at: new Date(),
        })
        .where(eq(teams.id, teamId));
    }

    return c.json({
      message: "Team removed from league successfully",
    });
  } catch (error) {
    console.error("Remove team from league error:", error);
    return c.json({ error: "Failed to remove team from league" }, 500);
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

    // Validate level is one of: "2", "3", "4"
    if (!["2", "3", "4"].includes(level)) {
      return c.json({ error: "Level must be 2, 3, or 4" }, 400);
    }

    // Validate gender is one of: "male", "female", "mixed"
    if (!["male", "female", "mixed"].includes(gender)) {
      return c.json({ error: "Gender must be male, female, or mixed" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    const isAdmin = user.role === "admin";

    // Admin-specific behavior: Admins can create teams of any gender regardless of their own gender,
    // and teams are created empty (no members added). This allows admins to create placeholder teams
    // that can be populated later. Regular players must match team gender and are added as the first member.
    // Validate creator's gender matches team gender requirement (skip for admins)
    if (!isAdmin) {
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
    }

    // Check if team name is unique (globally since teams no longer require leagues)
    const [existingTeam] = await db
      .select()
      .from(teams)
      .where(eq(teams.name, sanitizedName));

    if (existingTeam) {
      return c.json({ error: "Team name must be unique" }, 409);
    }

    // Generate unique passcode
    const teamPasscode = await generateUniquePasscode(db);

    // Create team without league_id
    const teamId = randomUUID();
    const [newTeam] = await db
      .insert(teams)
      .values({
        id: teamId,
        name: sanitizedName,
        level: level as "2" | "3" | "4",
        gender: gender as "male" | "female" | "mixed",
        league_id: null,
        created_by: user.id,
        passcode: teamPasscode,
      })
      .returning();

    // Add creator as team member (skip for admins - teams created empty for later population)
    if (!isAdmin) {
      await db
        .insert(team_members)
        .values({
          id: randomUUID(),
          team_id: teamId,
          user_id: user.id,
        })
        .returning();

      // Create notification for team creation (creator joins the team they created)
      await db.insert(team_change_notifications).values({
        id: randomUUID(),
        user_id: user.id, // The player who created the team (and joined it)
        team_id: teamId,
        action: "joined",
        created_at: new Date(),
        read: false,
      });
    }

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

    // Get teams where user is a member (using leftJoin for nullable league)
    const userTeams = await db
      .select({
        team: teams,
        league: {
          id: leagues.id,
          name: leagues.name,
          start_date: leagues.start_date,
          end_date: leagues.end_date,
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
      .where(
        sql`${teams.id} IN (
          SELECT tm.team_id 
          FROM ${team_members} tm 
          WHERE tm.user_id = ${user.id}
        )`
      );

    // Get payment status for the current user for each team's primary league
    const teamLeaguePairs = userTeams
      .filter(t => t.league?.id)
      .map(t => ({ teamId: t.team.id, leagueId: t.league!.id }));
    
    const userPaymentStatuses = teamLeaguePairs.length > 0
      ? await Promise.all(
          teamLeaguePairs.map(async ({ teamId, leagueId }) => {
            const results = await db
              .select()
              .from(league_payments)
              .where(
                and(
                  eq(league_payments.user_id, user.id),
                  eq(league_payments.team_id, teamId),
                  eq(league_payments.league_id, leagueId)
                )
              );
            return results[0] ? { teamId, payment: results[0] } : null;
          })
        ).then(results => results.filter(Boolean))
      : [];

    // Create a map of team_id -> payment status
    const paymentStatusMap = new Map(
      userPaymentStatuses.map((item: any) => [
        item.teamId,
        {
          paid: item.payment.paid,
          paid_at: item.payment.paid_at ? item.payment.paid_at.toISOString() : null,
          paid_amount: item.payment.paid_amount ? parseFloat(item.payment.paid_amount) : null,
        }
      ])
    );

    // Normalize null league to null in response and add payment status
    const normalizedTeams = userTeams.map(t => ({
      ...t,
      league: t.league?.id ? t.league : null,
      user_payment_status: paymentStatusMap.get(t.team.id) || null,
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

// Lookup team by passcode (for confirmation before joining)
// IMPORTANT: This must be registered BEFORE /teams/:id to avoid route conflicts
protectedRoutes.get("/teams/lookup", async (c) => {
  try {
    const user = c.get("user");
    const passcode = c.req.query("passcode");

    if (!passcode) {
      return c.json({ error: "Passcode is required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Find team by passcode (case-insensitive, trimmed)
    const normalizedPasscode = passcode.trim().toUpperCase();
    
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.passcode, normalizedPasscode));

    if (!team) {
      return c.json({ error: "Invalid passcode" }, 404);
    }

    // Validate if user can join (but don't join yet)
    const validation = await validateTeamJoin(db, user, team);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    // Return team information for confirmation dialog
    return c.json({
      team: {
        id: team.id,
        name: team.name,
        level: team.level,
        gender: team.gender,
      },
    });
  } catch (error) {
    console.error("Team lookup error:", error);
    return c.json({ error: "Failed to lookup team" }, 500);
  }
});

protectedRoutes.get("/teams/:id", async (c) => {
  try {
    const user = c.get("user");
    const teamId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get team details with optional league (using leftJoin for nullable foreign keys)
    const [teamData] = await db
      .select({
        team: teams,
        league: {
          id: leagues.id,
          name: leagues.name,
          start_date: leagues.start_date,
          end_date: leagues.end_date,
        },
      })
      .from(teams)
      .leftJoin(leagues, eq(teams.league_id, leagues.id))
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
    // Use leftJoin to include all members even if user doesn't exist (data integrity issue)
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
          profile_picture_url: users.profile_picture_url,
        },
      })
      .from(team_members)
      .leftJoin(users, eq(team_members.user_id, users.id))
      .where(eq(team_members.team_id, teamId));
    
    // Check for members with missing users (data integrity issue)
    const membersWithMissingUsers = members.filter(m => !m.user || !m.user.id);
    if (membersWithMissingUsers.length > 0) {
      console.warn(`[GET /teams/:id] Team ${teamId}: Found ${membersWithMissingUsers.length} members with missing user records`);
    }

    // Only include passcode if user is team creator or team member (not for arbitrary users)
    const isTeamCreator = teamData.team.created_by === user.id;
    const isTeamMember = !!membership;
    const teamResponse = { ...teamData.team };
    
    if (!isTeamCreator && !isTeamMember && user.role !== "admin") {
      // Remove passcode from response if user is neither creator nor member
      delete teamResponse.passcode;
    }

    return c.json({
      team: {
        team: teamResponse,
        league: teamData.league || null,
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
    const { name, level } = body;

    // Only admins can update teams
    if (user.role !== "admin") {
      return c.json({ error: "Only admins can update teams" }, 403);
    }

    // Validate that at least one field is being updated
    if (!name && !level) {
      return c.json({ error: "At least one field (name or level) must be provided" }, 400);
    }

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

    // Validate and sanitize name if provided
    let sanitizedName: string | undefined;
    if (name !== undefined) {
      sanitizedName = sanitizeText(name);
      if (!sanitizedName) {
        return c.json({ error: "Team name cannot be empty" }, 400);
      }

      // Check if new name is unique (globally if no league, within each league if team is in any leagues)
      // Get all leagues this team is in
      const teamLeagues = await db
        .select({ league_id: team_leagues.league_id })
        .from(team_leagues)
        .where(eq(team_leagues.team_id, teamId));

      if (teamLeagues.length > 0) {
        // If team is in any leagues, check uniqueness within each league
        const leagueIds = teamLeagues.map(tl => tl.league_id);
        const [existingTeam] = await db
          .select()
          .from(teams)
          .innerJoin(team_leagues, eq(teams.id, team_leagues.team_id))
          .where(
            and(
              inArray(team_leagues.league_id, leagueIds),
              eq(teams.name, sanitizedName),
              ne(teams.id, teamId)
            )
          );

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
    }

    // Validate level if provided
    if (level !== undefined) {
      const validLevels = ["2", "3", "4"];
      if (!validLevels.includes(level)) {
        return c.json({ error: "Level must be 2, 3, or 4" }, 400);
      }

      // Note: We don't validate that the team level matches the league level here
      // because this constraint only applies when adding a team to a league,
      // not when updating an existing team's level
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date(),
    };
    if (sanitizedName !== undefined) {
      updateData.name = sanitizedName;
    }
    if (level !== undefined) {
      updateData.level = level;
    }

    // Update team
    const [updatedTeam] = await db
      .update(teams)
      .set(updateData)
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

    // Check if team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Only admin can delete teams
    if (user.role !== "admin") {
      return c.json({ error: "Only admins can delete teams" }, 403);
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

    // Check if team exists
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId));

    if (!team) {
      return c.json({ error: "Team not found" }, 404);
    }

    // Only admin can add members (other way is using passcode)
    if (user.role !== "admin") {
      return c.json({ error: "Only admins can add members" }, 403);
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
      })
      .returning();

    // Create notification for team member addition
    await db.insert(team_change_notifications).values({
      id: randomUUID(),
      user_id: user_id, // The player who was added to the team, not the team creator/admin who performed the action
      team_id: teamId,
      action: "joined",
      created_at: new Date(),
      read: false,
    });

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

    // Admins can remove any member
    const isAdmin = user.role === "admin";
    
    // Check if the user requesting removal is a member of the team (unless admin)
    if (!isAdmin) {
      const [requesterMembership] = await db
        .select()
        .from(team_members)
        .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, user.id)));

      if (!requesterMembership) {
        return c.json({ error: "You must be a member of the team to remove members" }, 403);
      }
    }

    // Check if membership exists for the user being removed
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

    // Create notification for team member removal
    await db.insert(team_change_notifications).values({
      id: randomUUID(),
      user_id: userId, // The player who was removed from the team, not the person/admin who performed the removal
      team_id: teamId,
      action: "removed",
      created_at: new Date(),
      read: false,
    });

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

    // Check if user is a team member or admin
    const [membership] = await db
      .select()
      .from(team_members)
      .where(and(eq(team_members.team_id, teamId), eq(team_members.user_id, user.id)));

    if (!membership && user.role !== "admin") {
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

// Helper function to validate if a user can join a team (shared by lookup and join endpoints)
async function validateTeamJoin(db: any, user: any, team: any): Promise<{ valid: boolean; error?: string }> {
  // Check if user is an admin
  if (user.role === "admin") {
    return { valid: false, error: "Admins cannot join teams" };
  }

  // Check if user is already a member of this team (check this first for better UX)
  const [membership] = await db
    .select()
    .from(team_members)
    .where(and(eq(team_members.team_id, team.id), eq(team_members.user_id, user.id)));

  if (membership) {
    return { valid: false, error: "You are already a member of this team" };
  }

  // Check if team has fewer than 4 members
  const existingMembers = await db
    .select()
    .from(team_members)
    .where(eq(team_members.team_id, team.id));

  if (existingMembers.length >= 4) {
    return { valid: false, error: `Team is full (${existingMembers.length}/4 members)` };
  }

  // Get user details for gender validation
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id));

  if (!targetUser) {
    return { valid: false, error: "User not found" };
  }

  // Validate gender compatibility
  if (!targetUser.gender) {
    return { valid: false, error: "Player must have a gender set in their profile" };
  }

  if (team.gender === "male" && targetUser.gender !== "male") {
    return { valid: false, error: "Masculine teams can only contain male players" };
  }

  if (team.gender === "female" && targetUser.gender !== "female") {
    return { valid: false, error: "Feminine teams can only contain female players" };
  }

  // For mixed teams, validate both genders when reaching 4 members
  if (team.gender === "mixed") {
    if (existingMembers.length === 3) {
      // Get genders of current members
      const memberGenders = await db
        .select({ gender: users.gender })
        .from(users)
        .innerJoin(team_members, eq(users.id, team_members.user_id))
        .where(eq(team_members.team_id, team.id));

      const maleCount = memberGenders.filter(m => m.gender === "male").length;
      const femaleCount = memberGenders.filter(m => m.gender === "female").length;

      // Calculate new counts after adding this player
      const newMaleCount = targetUser.gender === "male" ? maleCount + 1 : maleCount;
      const newFemaleCount = targetUser.gender === "female" ? femaleCount + 1 : femaleCount;

      // Mixed teams must have at least one of each gender when full
      if (newMaleCount === 0 || newFemaleCount === 0) {
        return { valid: false, error: "Mixed teams must contain both masculine and feminine players" };
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
    .where(eq(team_members.user_id, user.id));

  const conflictingTeam = existingMemberships.find(
    (membership) => membership.team_level === team.level && membership.team_gender === team.gender
  );

  if (conflictingTeam) {
    return { 
      valid: false, 
      error: `Player is already on a Level ${team.level} ${team.gender === 'male' ? 'masculine' : team.gender === 'female' ? 'feminine' : 'mixed'} team (${conflictingTeam.team_name})` 
    };
  }

  return { valid: true };
}

// Join team by passcode
protectedRoutes.post("/teams/join", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const { passcode } = body;

    if (!passcode) {
      return c.json({ error: "Passcode is required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Find team by passcode (case-insensitive, trimmed)
    const normalizedPasscode = passcode.trim().toUpperCase();
    
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.passcode, normalizedPasscode));

    if (!team) {
      return c.json({ error: "Invalid passcode" }, 404);
    }

    // Re-validate if user can join
    const validation = await validateTeamJoin(db, user, team);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    // Add user to team
    const [newMember] = await db
      .insert(team_members)
      .values({
        id: randomUUID(),
        team_id: team.id,
        user_id: user.id,
      })
      .returning();

    // Create notification for team member addition via passcode join
    await db.insert(team_change_notifications).values({
      id: randomUUID(),
      user_id: user.id, // The player who joined via passcode
      team_id: team.id,
      action: "joined",
      created_at: new Date(),
      read: false,
    });

    return c.json({
      team: {
        id: team.id,
        name: team.name,
        level: team.level,
        gender: team.gender,
      },
      message: `Successfully joined ${team.name}`,
    });
  } catch (error) {
    console.error("Team join error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

protectedRoutes.get("/players/search", async (c) => {
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
        .innerJoin(team_leagues, eq(team_members.team_id, team_leagues.team_id))
        .where(eq(team_leagues.league_id, league_id));

      excludedUserIds = leagueTeamMembers.map(m => m.user_id);
    } else {
      // If no league_id, exclude users who are on a team with the same level AND gender
      // This allows players to be on teams with different level/gender combinations
      if (level && gender) {
        // Validate level and gender are valid enum values
        const validLevels = ["2", "3", "4"];
        const validGenders = ["male", "female", "mixed"];
        
        if (validLevels.includes(level) && validGenders.includes(gender)) {
          const conflictingTeamMembers = await db
            .select({ user_id: team_members.user_id })
            .from(team_members)
            .innerJoin(teams, eq(team_members.team_id, teams.id))
            .where(
              and(
                eq(teams.level, level as "2" | "3" | "4"),
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
    console.error("Player search error:", error);
    return c.json({ error: "Failed to retrieve available players" }, 500);
  }
});

// Calendar Generation Endpoints (Admin Only)
adminRoutes.post("/leagues/:leagueId/generate-calendar", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
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

    // Get league info
    console.log(`Getting league info for leagueId: ${leagueId}`);
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      console.log(`League not found for leagueId: ${leagueId}`);
      return c.json({ error: "League not found" }, 404);
    }

    console.log(`Found league:`, { id: league.id, name: league.name });

    // Generate calendar
    console.log("Creating calendar generator and generating calendar");
    const generator = new CalendarGenerator(db);
    const result = await generator.generateCalendar(leagueId, startDate);

    console.log(`Calendar generation completed. Saving ${result.matches.length} matches and ${result.byes.length} bye weeks to database`);
    // Save matches to database
    await generator.saveMatches(result.matches, leagueId);
    
    // Save bye weeks to database
    await generator.saveByeWeeks(result.byes, leagueId);

    console.log("Updating league dates");
    // Update league dates
    await generator.updateLeagueDates(leagueId, result.start_date, result.end_date);

    return c.json({
      matches: result.matches,
      byes: result.byes,
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

adminRoutes.get("/leagues/:leagueId/calendar", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    console.log(`Retrieving calendar for league: ${leagueId}`);
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Placeholder date for matches needing manual assignment
    const placeholderDate = new Date('2099-12-31');

    // Get all matches for the league
    // We get all matches (including placeholder dates) and separate them later
    const leagueMatches = await db
      .select()
      .from(matches)
      .where(eq(matches.league_id, leagueId))
      .orderBy(matches.week_number, matches.match_date);
    
    console.log(`Found ${leagueMatches.length} matches for league ${leagueId}`);

    // Get team details for all unique team IDs
    const teamIds = new Set<string>();
    leagueMatches.forEach(match => {
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

    // Separate matches with assigned dates from those needing manual assignment
    const assignedMatches = leagueMatches.filter(m => {
      const matchDate = new Date(m.match_date);
      return matchDate < placeholderDate;
    });
    const needsAssignmentMatches = leagueMatches.filter(m => {
      const matchDate = new Date(m.match_date);
      return matchDate >= placeholderDate;
    });

    // Combine matches with team details
    const matchesWithTeams = assignedMatches.map(match => ({
      match,
      home_team: teamMap.get(match.home_team_id) || { id: match.home_team_id, name: "Unknown Team" },
      away_team: teamMap.get(match.away_team_id) || { id: match.away_team_id, name: "Unknown Team" },
    }));

    // Also include matches needing assignment (with null date for display)
    const needsAssignmentWithTeams = needsAssignmentMatches.map(match => ({
      match: {
        ...match,
        match_date: null, // Mark as needing assignment
      },
      home_team: teamMap.get(match.home_team_id) || { id: match.home_team_id, name: "Unknown Team" },
      away_team: teamMap.get(match.away_team_id) || { id: match.away_team_id, name: "Unknown Team" },
    }));

    // Get bye weeks for this league
    const leagueByes = await db
      .select({
        bye: bye_weeks,
        team: {
          id: teams.id,
          name: teams.name,
        },
      })
      .from(bye_weeks)
      .innerJoin(teams, eq(bye_weeks.team_id, teams.id))
      .where(eq(bye_weeks.league_id, leagueId))
      .orderBy(bye_weeks.week_number);

    // Create a set of teams that have matches in each week
    // Key: `${team_id}-${week_number}`, Value: true
    const teamsWithMatches = new Set<string>();
    assignedMatches.forEach(match => {
      teamsWithMatches.add(`${match.home_team_id}-${match.week_number}`);
      teamsWithMatches.add(`${match.away_team_id}-${match.week_number}`);
    });

    // Filter out bye weeks where the team actually has a match that week
    const byesWithTeams = leagueByes
      .filter(row => {
        const key = `${row.bye.team_id}-${row.bye.week_number}`;
        return !teamsWithMatches.has(key);
      })
      .map(row => ({
        team_id: row.bye.team_id,
        team_name: row.team.name,
        week_number: row.bye.week_number,
      }));

    return c.json({
      matches: matchesWithTeams,
      needsAssignment: needsAssignmentWithTeams,
      byes: byesWithTeams,
      message: "Calendar retrieved successfully",
    });
  } catch (error) {
    console.error("Calendar retrieval error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      leagueId: c.req.param("leagueId")
    });
    return c.json(createErrorResponse("Failed to retrieve calendar", 500), 500);
  }
});

// Classifications endpoint
adminRoutes.get("/leagues/:leagueId/classifications", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    console.log(`Retrieving classifications for league: ${leagueId}`);
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Get all teams in the league
    const leagueTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.league_id, leagueId));

    // Get all matches for the league (future: when match results are added, filter by matches with results)
    const leagueMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.league_id, leagueId),
          sql`${matches.match_date} < ${sql.raw(`'2100-01-01'::timestamp`)}`
        )
      );

    // Initialize standings for each team
    const standings = new Map<string, {
      team_id: string;
      team_name: string;
      matches_played: number;
      wins: number;
      draws: number;
      losses: number;
      goals_for: number;
      goals_against: number;
      goal_difference: number;
      points: number;
    }>();

    leagueTeams.forEach(team => {
      standings.set(team.id, {
        team_id: team.id,
        team_name: team.name,
        matches_played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
      });
    });

    // Calculate standings from matches (when match results are added)
    // For now, all teams will have zero stats
    // TODO: When match results are added, update this logic:
    // - For each match with results:
    //   - If home_score and away_score exist:
    //     - Update home team: goals_for += home_score, goals_against += away_score
    //     - Update away team: goals_for += away_score, goals_against += home_score
    //     - If home_score > away_score: home wins, away loses
    //     - If away_score > home_score: away wins, home loses
    //     - If home_score === away_score: both draw
    //     - Update matches_played, wins, draws, losses accordingly
    //     - Calculate points: (wins * 3) + draws

    // Sort by points (desc), goal difference (desc), goals for (desc)
    const classifications = Array.from(standings.values())
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
        return b.goals_for - a.goals_for;
      })
      .map((entry, index) => ({
        ...entry,
        position: index + 1,
      }));

    return c.json({
      classifications,
      message: "Classifications retrieved successfully",
    });
  } catch (error) {
    console.error("Classifications retrieval error:", error);
    return c.json(createErrorResponse("Failed to retrieve classifications", 500), 500);
  }
});

// Manual match date assignment endpoint
adminRoutes.put("/leagues/:leagueId/matches/:matchId/date", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    const matchId = c.req.param("matchId");
    const body = await c.req.json();
    const { match_date, match_time } = body;

    if (!match_date || !match_time) {
      return c.json({ error: "Match date and time are required" }, 400);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Verify match exists and belongs to league
    const [match] = await db
      .select()
      .from(matches)
      .where(and(eq(matches.id, matchId), eq(matches.league_id, leagueId)));

    if (!match) {
      return c.json({ error: "Match not found" }, 404);
    }

    // Verify match has placeholder date (needs manual assignment)
    const placeholderDate = new Date('2099-12-31');
    if (match.match_date && new Date(match.match_date) < placeholderDate) {
      return c.json({ error: "Match already has an assigned date. Please use the edit functionality to change it." }, 400);
    }

    // Get league dates for validation
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId));

    if (!league) {
      return c.json({ error: "League not found" }, 404);
    }

    // Validate date is within league dates (if they exist)
    const assignedDate = new Date(match_date);
    if (league.start_date && assignedDate < new Date(league.start_date)) {
      return c.json({ error: "Match date cannot be before league start date" }, 400);
    }
    if (league.end_date && assignedDate > new Date(league.end_date)) {
      return c.json({ error: "Match date cannot be after league end date" }, 400);
    }

    // Check for player match conflicts
    const homeTeamMembers = await db
      .select({ user_id: team_members.user_id })
      .from(team_members)
      .where(eq(team_members.team_id, match.home_team_id));

    const awayTeamMembers = await db
      .select({ user_id: team_members.user_id })
      .from(team_members)
      .where(eq(team_members.team_id, match.away_team_id));

    const allPlayerIds = new Set([
      ...homeTeamMembers.map(m => m.user_id),
      ...awayTeamMembers.map(m => m.user_id)
    ]);

    // Check for existing matches on the same date involving any of these players
    const dateStr = assignedDate.toISOString().split('T')[0];
    const existingMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          sql`DATE(${matches.match_date}) = DATE(${sql.raw(`'${dateStr}'`)})`,
          sql`${matches.match_date} < ${sql.raw(`'2100-01-01'::timestamp`)}`,
          sql`${matches.id} != ${matchId}`
        )
      );

    for (const existingMatch of existingMatches) {
      const existingHomeMembers = await db
        .select({ user_id: team_members.user_id })
        .from(team_members)
        .where(eq(team_members.team_id, existingMatch.home_team_id));

      const existingAwayMembers = await db
        .select({ user_id: team_members.user_id })
        .from(team_members)
        .where(eq(team_members.team_id, existingMatch.away_team_id));

      const existingMatchPlayers = new Set([
        ...existingHomeMembers.map(m => m.user_id),
        ...existingAwayMembers.map(m => m.user_id)
      ]);

      // Check for intersection
      for (const playerId of allPlayerIds) {
        if (existingMatchPlayers.has(playerId)) {
          return c.json({ 
            error: `Player conflict detected: A player from this match already has another match scheduled on ${dateStr}` 
          }, 400);
        }
      }
    }

    // Update match date and time
    const combinedDateTime = new Date(match_date);
    const [hours, minutes] = match_time.split(':');
    combinedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    await db
      .update(matches)
      .set({
        match_date: combinedDateTime,
        match_time: match_time,
        updated_at: new Date(),
      })
      .where(eq(matches.id, matchId));

    return c.json({
      message: "Match date assigned successfully",
    });
  } catch (error) {
    console.error("Match date assignment error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to assign match date";
    return c.json(createErrorResponse(errorMessage, 500), 500);
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

// Admin: Get team change notifications
adminRoutes.get("/team-change-notifications", async (c) => {
  try {
    const filter = c.req.query("filter") || "unread";
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Build base query with joins
    let baseQuery = db
      .select({
        id: team_change_notifications.id,
        player_name: sql<string>`COALESCE(
          ${users.display_name},
          NULLIF(TRIM(COALESCE(${users.first_name}, '') || ' ' || COALESCE(${users.last_name}, '')), ''),
          ${users.email}
        )`,
        action: team_change_notifications.action,
        team_name: teams.name,
        date: team_change_notifications.created_at,
        read: team_change_notifications.read,
        read_at: team_change_notifications.read_at,
      })
      .from(team_change_notifications)
      .innerJoin(users, eq(team_change_notifications.user_id, users.id))
      .innerJoin(teams, eq(team_change_notifications.team_id, teams.id));

    // Apply filter
    if (filter === "read") {
      baseQuery = baseQuery.where(eq(team_change_notifications.read, true));
    } else if (filter === "unread") {
      baseQuery = baseQuery.where(eq(team_change_notifications.read, false));
    }
    // If filter === "all", no additional WHERE clause

    // Order by date descending (newest first)
    const notifications = await baseQuery.orderBy(desc(team_change_notifications.created_at));

    return c.json({
      notifications: notifications.map(n => ({
        id: n.id,
        player_name: n.player_name,
        action: n.action,
        team_name: n.team_name,
        date: n.date.toISOString(),
        read: n.read,
        read_at: n.read_at ? n.read_at.toISOString() : null,
      })),
    });
  } catch (error: any) {
    console.error("Get team change notifications error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      detail: error?.detail,
    });
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Admin: Mark notification as read
adminRoutes.post("/team-change-notifications/:id/read", async (c) => {
  try {
    const notificationId = c.req.param("id");
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Check if notification exists
    const [notification] = await db
      .select()
      .from(team_change_notifications)
      .where(eq(team_change_notifications.id, notificationId));

    if (!notification) {
      return c.json({ error: "Notification not found" }, 404);
    }

    // Update notification to read
    const [updated] = await db
      .update(team_change_notifications)
      .set({
        read: true,
        read_at: new Date(),
      })
      .where(eq(team_change_notifications.id, notificationId))
      .returning();

    return c.json({
      notification: {
        id: updated.id,
        read: updated.read,
        read_at: updated.read_at ? updated.read_at.toISOString() : null,
      },
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    const { message, status } = handleDatabaseError(error);
    return c.json({ error: message }, status as any);
  }
});

// Clear calendar endpoint
adminRoutes.delete("/leagues/:leagueId/calendar", async (c) => {
  try {
    const leagueId = c.req.param("leagueId");
    console.log(`Clearing calendar for league: ${leagueId}`);
    
    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Delete all bye weeks for this league (if table exists)
    try {
      await db
        .delete(bye_weeks)
        .where(eq(bye_weeks.league_id, leagueId));
      console.log(`Deleted bye weeks for league ${leagueId}`);
    } catch (error: any) {
      // If table doesn't exist, that's okay
      if (!error.message?.includes('does not exist')) {
        console.warn(`Error deleting bye weeks: ${error.message}`);
      }
    }

    // Delete all matches for this league
    const deletedMatches = await db
      .delete(matches)
      .where(eq(matches.league_id, leagueId));

    console.log(`Deleted matches for league ${leagueId}`);

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

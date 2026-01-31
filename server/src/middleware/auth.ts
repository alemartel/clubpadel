import { MiddlewareHandler } from "hono";
import { verifyFirebaseToken } from "../lib/firebase-auth.js";
import { getDatabase } from "../lib/db.js";
import { getTenantHostFromRequest, resolveTenantIdFromHost } from "../lib/tenant.js";
import { eq, and } from "drizzle-orm";
import { User, users } from "../schema/users.js";
import { team_members, team_change_notifications } from "../schema/teams.js";
import { teams } from "../schema/teams.js";
import { leagues } from "../schema/leagues.js";
import { getFirebaseProjectId, getDatabaseUrl } from "../lib/env.js";

declare module "hono" {
  interface ContextVariableMap {
    user: User;
    tenantId: string;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const host = getTenantHostFromRequest(c.req.raw) ?? undefined;
    const tenantId = await resolveTenantIdFromHost(host);
    if (!tenantId) {
      return c.json({ error: "Tenant not found for this host" }, 403);
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.split("Bearer ")[1];
    const firebaseProjectId = getFirebaseProjectId();
    let firebaseUser;
    try {
      firebaseUser = await verifyFirebaseToken(token, firebaseProjectId);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // First, try to find user by Firebase ID and tenant
    let user: User | null =
      (await db
        .select()
        .from(users)
        .where(and(eq(users.id, firebaseUser.id), eq(users.tenant_id, tenantId)))
        .limit(1))[0] ?? null;

    // If user doesn't exist by ID, try to find by email within this tenant
    if (!user && firebaseUser.email) {
      const [userByEmail] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, firebaseUser.email), eq(users.tenant_id, tenantId)))
        .limit(1);

      if (userByEmail) {
        // User exists with different ID - we'll migrate it below
        user = null; // Set to null so we go through migration logic
      } else {
        // User doesn't exist at all - create new user in this tenant
        const adminEmails = ["admin@mypadelcenter.com"];
        const isAdmin = firebaseUser.email && adminEmails.includes(firebaseUser.email.toLowerCase());

        await db
          .insert(users)
          .values({
            id: firebaseUser.id,
            tenant_id: tenantId,
            email: firebaseUser.email,
            display_name: null,
            photo_url: null,
            role: isAdmin ? "admin" : "player",
          })
          .onConflictDoNothing();

        // Get the newly created user
        [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.id, firebaseUser.id), eq(users.tenant_id, tenantId)))
          .limit(1);
      }
    }

    if (!user) {
      // Try to find user by email within this tenant (migration case)
      const [userByEmail] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, firebaseUser.email!), eq(users.tenant_id, tenantId)))
        .limit(1);
      
      if (userByEmail) {
        const oldUserId = userByEmail.id;
        const newUserId = firebaseUser.id;
        
        // First, check if the new user already exists (by ID)
        let [newUserExists] = await db
          .select()
          .from(users)
          .where(eq(users.id, newUserId))
          .limit(1);
        
        // If the new user doesn't exist, create it
        if (!newUserExists) {
          try {
            // Temporarily change old user's email to allow new user creation
            const tempEmail = `${oldUserId}@temp.migrating`;
            await db
              .update(users)
              .set({ email: tempEmail })
              .where(eq(users.id, oldUserId));
            
            // Now create the new user
            await db
              .insert(users)
              .values({
                id: newUserId,
                tenant_id: userByEmail.tenant_id,
                email: firebaseUser.email!,
                display_name: userByEmail.display_name,
                photo_url: userByEmail.photo_url,
                first_name: userByEmail.first_name,
                last_name: userByEmail.last_name,
                phone_number: userByEmail.phone_number,
                dni: userByEmail.dni,
                tshirt_size: userByEmail.tshirt_size,
                gender: userByEmail.gender,
                role: userByEmail.role,
                profile_picture_url: userByEmail.profile_picture_url,
                created_at: userByEmail.created_at,
                updated_at: new Date(),
              });
            
            // Verify the new user was created
            [newUserExists] = await db
              .select()
              .from(users)
              .where(eq(users.id, newUserId))
              .limit(1);
          } catch (insertError: any) {
            // Restore old user's email if insert failed
            await db
              .update(users)
              .set({ email: firebaseUser.email! })
              .where(eq(users.id, oldUserId))
              .catch(() => {});
            
            // Check if user exists now (might have been created by another request)
            [newUserExists] = await db
              .select()
              .from(users)
              .where(eq(users.id, newUserId))
              .limit(1);
            
            // If still doesn't exist and it's not a duplicate key error, throw
            if (!newUserExists && !insertError.code?.includes('23505') && !insertError.message?.includes('duplicate')) {
              throw insertError;
            }
          }
        }
        
        // Final verification that the new user exists
        if (!newUserExists) {
          throw new Error(`Failed to create or find new user with ID ${newUserId}`);
        }
        
        // Now update all foreign key references from old ID to new ID
        // The new user_id now exists in the users table, so this won't violate constraints
        
        // Update team_members
        await db
          .update(team_members)
          .set({ user_id: newUserId })
          .where(eq(team_members.user_id, oldUserId));
        
        // Update team_change_notifications
        await db
          .update(team_change_notifications)
          .set({ user_id: newUserId })
          .where(eq(team_change_notifications.user_id, oldUserId));
        
        // Update teams.created_by
        await db
          .update(teams)
          .set({ created_by: newUserId })
          .where(eq(teams.created_by, oldUserId));
        
        // Update leagues.created_by
        await db
          .update(leagues)
          .set({ created_by: newUserId })
          .where(eq(leagues.created_by, oldUserId));
        
        // Now delete the old user record (since we've migrated everything to the new ID)
        await db
          .delete(users)
          .where(eq(users.id, oldUserId));
        
        // Get the new user
        const [updatedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, newUserId))
          .limit(1);
        
        if (updatedUser) {
          if (updatedUser.tenant_id !== tenantId) {
            return c.json({ error: "User does not belong to this tenant" }, 403);
          }
          c.set("tenantId", tenantId);
          c.set("user", updatedUser);
          await next();
          return;
        }
      }

      throw new Error("Failed to create or retrieve user");
    }

    if (user.tenant_id !== tenantId) {
      return c.json({ error: "User does not belong to this tenant" }, 403);
    }
    c.set("tenantId", tenantId);
    c.set("user", user);
    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
};

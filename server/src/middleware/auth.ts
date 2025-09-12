import { MiddlewareHandler } from "hono";
import { verifyFirebaseToken } from "../lib/firebase-auth";
import { getDatabase } from "../lib/db";
import { eq } from "drizzle-orm";
import { User, users } from "../schema/users";
import { getFirebaseProjectId, getDatabaseUrl } from "../lib/env";

declare module "hono" {
  interface ContextVariableMap {
    user: User;
  }
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.split("Bearer ")[1];
    const firebaseProjectId = getFirebaseProjectId();
    const firebaseUser = await verifyFirebaseToken(token, firebaseProjectId);
    
    console.log("Firebase user from token:", {
      id: firebaseUser.id,
      email: firebaseUser.email
    });

    const databaseUrl = getDatabaseUrl();
    const db = await getDatabase(databaseUrl);

    // Upsert: insert if not exists, do nothing if exists
    await db
      .insert(users)
      .values({
        id: firebaseUser.id,
        email: firebaseUser.email!,
        display_name: null,
        photo_url: null,
        role: "player", // Default role for new users
      })
      .onConflictDoNothing();

    // Get the user (either just created or already existing)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, firebaseUser.id))
      .limit(1);

    console.log("User lookup result:", {
      firebaseId: firebaseUser.id,
      foundUser: user ? { id: user.id, email: user.email } : null
    });

    if (!user) {
      // Try to find user by email as fallback
      const [userByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, firebaseUser.email!))
        .limit(1);
      
      console.log("User lookup by email:", {
        email: firebaseUser.email,
        foundUser: userByEmail ? { id: userByEmail.id, email: userByEmail.email } : null
      });
      
      if (userByEmail) {
        // Update the user's ID to match the Firebase ID
        await db
          .update(users)
          .set({ id: firebaseUser.id })
          .where(eq(users.email, firebaseUser.email!));
        
        // Get the updated user
        const [updatedUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, firebaseUser.id))
          .limit(1);
        
        if (updatedUser) {
          c.set("user", updatedUser);
          await next();
          return;
        }
      }
      
      throw new Error("Failed to create or retrieve user");
    }

    c.set("user", user);
    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({ error: "Unauthorized" }, 401);
  }
};

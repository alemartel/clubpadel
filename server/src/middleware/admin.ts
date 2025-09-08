import { MiddlewareHandler } from "hono";
import { User } from "../schema/users";

declare module "hono" {
  interface ContextVariableMap {
    adminUser: User;
  }
}

export const adminMiddleware: MiddlewareHandler = async (c, next) => {
  try {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (user.role !== "admin") {
      return c.json({ error: "Admin access required" }, 403);
    }

    c.set("adminUser", user);
    await next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return c.json({ error: "Admin access required" }, 403);
  }
};

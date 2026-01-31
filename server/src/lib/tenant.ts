import { getDatabase } from "./db.js";
import { getDatabaseUrl } from "./env.js";
import { tenants } from "../schema/tenants.js";
import { eq } from "drizzle-orm";

/**
 * Normalize Host header: strip port (e.g. "localhost:8787" -> "localhost").
 */
export function normalizeHost(host: string | undefined): string | null {
  if (!host || typeof host !== "string") return null;
  const trimmed = host.trim();
  if (!trimmed) return null;
  const withoutPort = trimmed.split(":")[0];
  return withoutPort.toLowerCase();
}

/**
 * Resolve tenant_id from Host header. Returns null if no tenant is registered for that host.
 */
export async function resolveTenantIdFromHost(host: string | undefined): Promise<string | null> {
  const normalized = normalizeHost(host);
  if (!normalized) return null;

  const databaseUrl = getDatabaseUrl();
  const db = await getDatabase(databaseUrl);

  const [row] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.host, normalized))
    .limit(1);

  return row?.id ?? null;
}

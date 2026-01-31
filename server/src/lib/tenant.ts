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
 * Get the host to use for tenant resolution from the request.
 * Uses the frontend origin so multi-tenant works when the API is on a different domain:
 * 1. Origin (e.g. https://inplay.mypadelcenter.com → inplay.mypadelcenter.com)
 * 2. Referer (same)
 * 3. Host (when same-origin or no Origin/Referer, e.g. local dev)
 */
export function getTenantHostFromRequest(req: Request): string | null {
  const origin = req.headers.get("Origin");
  if (origin) {
    try {
      const u = new URL(origin);
      return normalizeHost(u.hostname) ?? u.hostname.toLowerCase();
    } catch {
      // ignore invalid Origin
    }
  }
  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      const u = new URL(referer);
      return normalizeHost(u.hostname) ?? u.hostname.toLowerCase();
    } catch {
      // ignore invalid Referer
    }
  }
  const host = req.headers.get("Host");
  return normalizeHost(host ?? undefined);
}

/** Default tenant id for local dev when frontend host is localhost/127.0.0.1 and not in DB. */
const DEFAULT_TENANT_ID = "inplay";

/** Frontend hosts that map to default tenant when not in DB (local dev only). */
const LOCAL_FALLBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * Resolve tenant_id from the given host (use getTenantHostFromRequest(req) to get frontend host).
 * Returns null if no tenant is registered for that host.
 * Fallback: localhost/127.0.0.1 map to default tenant for local development.
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

  if (row) return row.id;

  if (LOCAL_FALLBACK_HOSTS.has(normalized)) {
    return DEFAULT_TENANT_ID;
  }

  return null;
}

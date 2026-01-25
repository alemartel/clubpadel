// Direct import so Vercel detects this as a Hono entrypoint
import "hono";
import app from "./api";

export default app;
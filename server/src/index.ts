// Direct import so Vercel detects this as a Hono entrypoint (project uses "type": "module")
import "hono";
import app from "./api";

export default app;
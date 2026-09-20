import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-82d9e30e/health", (c) => c.json({ status: "ok" }));

// Read a collection
app.get("/make-server-82d9e30e/data/:key", async (c) => {
  const key = c.req.param("key");
  const data = await kv.get(key);
  return c.json({ data: data ?? null });
});

// Write a collection
app.post("/make-server-82d9e30e/data/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  await kv.set(key, body.data);
  return c.json({ ok: true });
});

// Delete a collection
app.delete("/make-server-82d9e30e/data/:key", async (c) => {
  const key = c.req.param("key");
  await kv.del(key);
  return c.json({ ok: true });
});

Deno.serve(app.fetch);

import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../index";
import { requireAuth } from "../lib/auth";
import { ok, fail } from "../lib/response";
import {
  generateToken,
  hashToken,
  SCOPES,
  type AccessToken,
} from "../lib/tokens";
import { getQrById } from "../lib/db";

const r = new Hono<AppEnv>();
r.use("*", requireAuth);
r.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (
    !["GET", "HEAD"].includes(c.req.method) &&
    c.req.header("origin") !== new URL(c.req.url).origin
  )
    return fail(c, "invalid_origin", "Same-origin request required", 403);
  await next();
});
const columns =
  "id, name, prefix, scopes, qr_id, created_at, expires_at, last_used_at, revoked_at";
r.get("/", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT ${columns} FROM access_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
  )
    .bind(c.get("user").uid)
    .all<AccessToken>();
  return ok(c, {
    tokens: rows.results.map((t) => ({ ...t, scopes: JSON.parse(t.scopes) })),
  });
});
r.get("/events", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT id, token_id, method, path, status, created_at FROM api_audit_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
  )
    .bind(c.get("user").uid)
    .all();
  return ok(c, { events: rows.results });
});
r.post("/", async (c) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      scopes: z.array(z.enum(SCOPES)).min(1).max(4),
      expires_in_days: z.number().int().min(1).max(365),
      qr_id: z.string().min(1).optional(),
    })
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    return fail(c, "invalid_input", parsed.error.message, 400);
  const { name, scopes, expires_in_days, qr_id } = parsed.data;
  const uid = c.get("user").uid;
  if (qr_id && !(await getQrById(c.env.DB, qr_id, uid)))
    return fail(c, "not_found", "QR not found", 404);
  const token = generateToken();
  const id = crypto.randomUUID(),
    ts = Date.now(),
    expires = ts + expires_in_days * 86400000;
  const result = await c.env.DB.prepare(
    `INSERT INTO access_tokens (id,user_id,name,token_hash,prefix,scopes,qr_id,created_at,expires_at)
    SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM access_tokens WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ?) < 20`,
  )
    .bind(
      id,
      uid,
      name,
      await hashToken(token),
      token.slice(0, 16),
      JSON.stringify([...new Set(scopes)]),
      qr_id ?? null,
      ts,
      expires,
      uid,
      ts,
    )
    .run();
  if (!result.meta.changes)
    return fail(
      c,
      "token_limit",
      "Revoke an active token first (maximum 20)",
      409,
    );
  return ok(c, { token, id, name, expires_at: expires }, 201);
});
r.delete("/:id", async (c) => {
  const result = await c.env.DB.prepare(
    "UPDATE access_tokens SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ? AND user_id = ?",
  )
    .bind(Date.now(), c.req.param("id"), c.get("user").uid)
    .run();
  if (!result.meta.changes) return fail(c, "not_found", "Token not found", 404);
  return ok(c, { revoked: true });
});
export default r;

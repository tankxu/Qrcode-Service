import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../index";
import { fail } from "./response";

export const SCOPES = [
  "qrs:read",
  "qrs:write",
  "qrs:delete",
  "images:write",
] as const;
export interface AccessToken {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  scopes: string;
  qr_id: string | null;
  created_at: number;
  expires_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}
export async function hashToken(value: string | ArrayBuffer) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        typeof value === "string" ? new TextEncoder().encode(value) : value,
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
export function generateToken() {
  return (
    "pqr_live_" +
    Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
export const requireToken: MiddlewareHandler<AppEnv> = async (c, next) => {
  const match = /^Bearer (pqr_live_[a-f0-9]{64})$/.exec(
    c.req.header("authorization") || "",
  );
  const reject = () => {
    c.header("WWW-Authenticate", 'Bearer realm="PandaQR"');
    return fail(
      c,
      "invalid_token",
      "A valid, unexpired access token is required",
      401,
    );
  };
  if (!match) return reject();
  const token = await c.env.DB.prepare(
    "SELECT * FROM access_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?",
  )
    .bind(await hashToken(match[1]), Date.now())
    .first<AccessToken>();
  if (!token) return reject();
  c.set("accessToken", token);
  c.set("user", { uid: token.user_id, sub: "", email: "" });
  const window = Math.floor(Date.now() / 60000);
  const rate = await c.env.DB.prepare(
    `INSERT INTO api_rate_limits(token_id, window, count) VALUES (?, ?, 1)
    ON CONFLICT(token_id) DO UPDATE SET count = CASE WHEN window = excluded.window THEN count + 1 ELSE 1 END,
    window = excluded.window RETURNING count`,
  )
    .bind(token.id, window)
    .first<{ count: number }>();
  c.header("X-RateLimit-Limit", "60");
  c.header(
    "X-RateLimit-Remaining",
    String(Math.max(0, 60 - (rate?.count || 0))),
  );
  c.header("X-RateLimit-Reset", String((window + 1) * 60));
  if ((rate?.count || 0) > 60) {
    c.header("Retry-After", String(60 - (Math.floor(Date.now() / 1000) % 60)));
    return fail(
      c,
      "rate_limited",
      "Maximum 60 requests per minute per token",
      429,
    );
  }
  await c.env.DB.prepare(
    "UPDATE access_tokens SET last_used_at = ? WHERE id = ?",
  )
    .bind(Date.now(), token.id)
    .run();
  await next();
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      `INSERT INTO api_audit_events (id, user_id, token_id, method, path, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        c.get("requestId"),
        token.user_id,
        token.id,
        c.req.method,
        c.req.path.slice(0, 512),
        c.res.status,
        Date.now(),
      )
      .run(),
  );
};
export const scope =
  (required: string): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    if (!JSON.parse(c.get("accessToken").scopes).includes(required))
      return fail(c, "insufficient_scope", `Requires ${required}`, 403);
    const restricted = c.get("accessToken").qr_id;
    const id = c.req.param("id");
    if (restricted && id && id !== restricted)
      return fail(c, "not_found", "QR not found", 404);
    await next();
  };

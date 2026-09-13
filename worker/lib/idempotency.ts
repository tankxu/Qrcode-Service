import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../index";
import { hashToken } from "./tokens";
import { fail } from "./response";

// A reservation survives uncertain failures: the same key never blindly repeats a write.
export const idempotency: MiddlewareHandler<AppEnv> = async (c, next) => {
  const key = c.req.header("Idempotency-Key");
  if (!key || !["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method))
    return next();
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(key))
    return fail(
      c,
      "invalid_input",
      "Idempotency-Key must be 1–128 ASCII letters, digits, . _ : or -",
      400,
    );
  const id = c.get("accessToken").id;
  const fingerprint = await hashToken(
    c.req.method +
      "\n" +
      c.req.path +
      "\n" +
      (c.req.header("content-type") || "") +
      "\n" +
      (await hashToken(await c.req.arrayBuffer())),
  );
  // Expired keys become reusable after 24 hours.
  await c.env.DB.prepare(
    "DELETE FROM api_idempotency WHERE token_id = ? AND key = ? AND created_at < ?",
  )
    .bind(id, key, Date.now() - 86400000)
    .run();
  const reserved = await c.env.DB.prepare(
    "INSERT OR IGNORE INTO api_idempotency(token_id,key,fingerprint,created_at) VALUES (?,?,?,?)",
  )
    .bind(id, key, fingerprint, Date.now())
    .run();
  if (!reserved.meta.changes) {
    const row = await c.env.DB.prepare(
      "SELECT fingerprint,response,status FROM api_idempotency WHERE token_id = ? AND key = ?",
    )
      .bind(id, key)
      .first<{
        fingerprint: string;
        response: string | null;
        status: number | null;
      }>();
    if (!row || row.fingerprint !== fingerprint)
      return fail(
        c,
        "idempotency_conflict",
        "This key was used for a different request",
        409,
      );
    if (!row.response || !row.status)
      return fail(
        c,
        "request_in_progress",
        "Previous outcome is pending or uncertain; read the QR before retrying",
        409,
      );
    c.header("Idempotency-Replayed", "true");
    c.header("Content-Type", "application/json");
    return c.body(row.response, row.status as 200);
  }
  await next();
  if (c.res.status < 500) {
    await c.env.DB.prepare(
      "UPDATE api_idempotency SET response = ?, status = ? WHERE token_id = ? AND key = ?",
    )
      .bind(await c.res.clone().text(), c.res.status, id, key)
      .run();
  }
};

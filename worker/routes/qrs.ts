import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { ok, fail } from "../lib/response";
import { createQrInputSchema, updateQrInputSchema } from "../lib/schemas";
import { createQr, deleteQr, getQrById, listUserQrs, updateQr } from "../lib/db";
import type { AppEnv } from "../index";
import type { QrRow, QrWithCounter } from "../lib/db";

const r = new Hono<AppEnv>();

const presentQr = (q: QrWithCounter) => ({
  id: q.id,
  slug: q.slug,
  title: q.title,
  description: q.description,
  note: q.note,
  status: q.status,
  target: { type: q.target_type, payload: JSON.parse(q.target_payload) },
  scan_total: q.scan_total,
  last_scan_at: q.last_scan_at,
  created_at: q.created_at,
  updated_at: q.updated_at,
});

r.use("*", requireAuth);

r.get("/", async (c) => {
  const user = c.get("user");
  const rows = await listUserQrs(c.env.DB, user.uid);
  return ok(c, { qrs: rows.map(presentQr) });
});

r.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createQrInputSchema.safeParse(body);
  if (!parsed.success) return fail(c, "invalid_input", parsed.error.message, 400);

  let row: QrRow;
  try {
    row = await createQr(c.env.DB, user.uid, parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === "slug_collision") {
      return fail(c, "slug_collision", "Could not allocate slug, retry", 503);
    }
    throw e;
  }

  const full = await getQrById(c.env.DB, row.id, user.uid);
  return ok(c, { qr: presentQr(full!) }, 201);
});

r.get("/:id", async (c) => {
  const user = c.get("user");
  const qr = await getQrById(c.env.DB, c.req.param("id"), user.uid);
  if (!qr) return fail(c, "not_found", "QR not found", 404);
  return ok(c, { qr: presentQr(qr) });
});

r.patch("/:id", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = updateQrInputSchema.safeParse(body);
  if (!parsed.success) return fail(c, "invalid_input", parsed.error.message, 400);

  const before = await getQrById(c.env.DB, c.req.param("id"), user.uid);
  if (!before) return fail(c, "not_found", "QR not found", 404);

  // If image target is being replaced, clean the old R2 object.
  let oldImageKey: string | null = null;
  if (parsed.data.target && before.target_type === "image") {
    try {
      const old = JSON.parse(before.target_payload) as { r2_key?: string };
      if (old.r2_key && (parsed.data.target.type !== "image" || old.r2_key !== parsed.data.target.payload.r2_key)) {
        oldImageKey = old.r2_key;
      }
    } catch {}
  }

  const updated = await updateQr(c.env.DB, c.req.param("id"), user.uid, parsed.data);
  if (!updated) return fail(c, "not_found", "QR not found", 404);

  // Invalidate KV cache
  await c.env.CACHE.delete(`target:${before.slug}`);

  if (oldImageKey) {
    c.executionCtx.waitUntil(c.env.IMAGES.delete(oldImageKey));
  }

  return ok(c, { qr: presentQr(updated) });
});

r.delete("/:id", async (c) => {
  const user = c.get("user");
  const removed = await deleteQr(c.env.DB, c.req.param("id"), user.uid);
  if (!removed) return fail(c, "not_found", "QR not found", 404);

  await c.env.CACHE.delete(`target:${removed.slug}`);

  if (removed.target_type === "image") {
    try {
      const p = JSON.parse(removed.target_payload) as { r2_key?: string };
      if (p.r2_key) c.executionCtx.waitUntil(c.env.IMAGES.delete(p.r2_key));
    } catch {}
  }

  return ok(c, { deleted: true });
});

export default r;

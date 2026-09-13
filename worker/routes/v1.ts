import { idempotency } from "../lib/idempotency";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AppEnv } from "../index";
import { ok, fail } from "../lib/response";
import { requireToken, scope } from "../lib/tokens";
import { createQrInputSchema, updateQrInputSchema } from "../lib/schemas";
import {
  createQr,
  getQrById,
  updateQr,
  deleteQr,
  type QrWithCounter,
} from "../lib/db";
import { presentQr } from "./qrs";
import { saveImage, validateImageTarget } from "../lib/images";

const r = new Hono<AppEnv>();
r.use("*", async (c, next) => {
  const id = crypto.randomUUID();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  c.header("Cache-Control", "no-store");
  await next();
});
r.onError((err, c) => {
  console.error("OpenAPI error", c.get("requestId"), err.name);
  return fail(
    c,
    "internal_error",
    "Unexpected server error; contact support with X-Request-Id",
    500,
  );
});
r.use("*", requireToken);
r.use(
  "*",
  bodyLimit({
    maxSize: 2 * 1024 * 1024 + 65536,
    onError: (c) => fail(c, "too_large", "Request exceeds upload limit", 413),
  }),
);
r.use("*", idempotency);
const present = (q: QrWithCounter) => ({
  ...presentQr(q),
  scan_url: `https://q.pandaqr.xyz/${q.slug}`,
});

r.get("/qrs", scope("qrs:read"), async (c) => {
  const rawLimit = c.req.query("limit") ?? "20";
  const cursor = c.req.query("cursor") ?? "";
  if (
    !/^\d+$/.test(rawLimit) ||
    +rawLimit < 1 ||
    +rawLimit > 100 ||
    (cursor && !/^[0-9A-HJKMNP-TV-Z]{26}$/.test(cursor))
  )
    return fail(
      c,
      "invalid_input",
      "limit must be 1–100; cursor must be a QR id",
      400,
    );
  const restricted = c.get("accessToken").qr_id;
  const rows = await c.env.DB.prepare(
    `SELECT q.*, COALESCE(s.total,0) AS scan_total, s.last_scan_at
    FROM qrs q LEFT JOIN scan_counters s ON s.qr_id = q.id
    WHERE q.user_id = ? AND (? = '' OR q.id < ?) AND (? IS NULL OR q.id = ?) ORDER BY q.id DESC LIMIT ?`,
  )
    .bind(
      c.get("user").uid,
      cursor,
      cursor,
      restricted,
      restricted,
      +rawLimit + 1,
    )
    .all<QrWithCounter>();
  const more = rows.results.length > +rawLimit,
    qrs = rows.results.slice(0, +rawLimit);
  return ok(c, {
    qrs: qrs.map(present),
    next_cursor: more ? qrs.at(-1)!.id : null,
  });
});
r.post("/qrs", scope("qrs:write"), async (c) => {
  if (c.get("accessToken").qr_id)
    return fail(
      c,
      "insufficient_scope",
      "QR-restricted tokens cannot create QRs",
      403,
    );
  const input = createQrInputSchema
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success) return fail(c, "invalid_input", input.error.message, 400);
  if (!(await validateImageTarget(c.env, c.get("user").uid, input.data.target)))
    return fail(
      c,
      "invalid_image",
      "Upload an image owned by this account first",
      400,
    );
  const qr = await createQr(c.env.DB, c.get("user").uid, input.data);
  c.header("Location", `/api/v1/qrs/${qr.id}`);
  return ok(
    c,
    { qr: present((await getQrById(c.env.DB, qr.id, c.get("user").uid))!) },
    201,
  );
});
r.get("/qrs/:id", scope("qrs:read"), async (c) => {
  const qr = await getQrById(c.env.DB, c.req.param("id"), c.get("user").uid);
  return qr
    ? ok(c, { qr: present(qr) })
    : fail(c, "not_found", "QR not found", 404);
});
r.patch("/qrs/:id", scope("qrs:write"), async (c) => {
  const input = updateQrInputSchema
    .strict()
    .safeParse(await c.req.json().catch(() => null));
  if (!input.success || !Object.keys(input.data).length)
    return fail(c, "invalid_input", "Provide valid fields to update", 400);
  const uid = c.get("user").uid;
  const before = await getQrById(c.env.DB, c.req.param("id"), uid);
  if (!before) return fail(c, "not_found", "QR not found", 404);
  if (!(await validateImageTarget(c.env, uid, input.data.target)))
    return fail(
      c,
      "invalid_image",
      "Upload an image owned by this account first",
      400,
    );
  const qr = await updateQr(c.env.DB, before.id, uid, input.data);
  if (!qr) return fail(c, "not_found", "QR not found", 404);
  return ok(c, { qr: present(qr) });
});
r.delete("/qrs/:id", scope("qrs:delete"), async (c) => {
  const qr = await deleteQr(c.env.DB, c.req.param("id"), c.get("user").uid);
  return qr
    ? ok(c, { deleted: true })
    : fail(c, "not_found", "QR not found", 404);
});
r.post("/images", scope("images:write"), async (c) => {
  // Restricted tokens only upload through their QR's single-step endpoint.
  if (c.get("accessToken").qr_id)
    return fail(
      c,
      "insufficient_scope",
      "Use the restricted QR image endpoint",
      403,
    );
  return upload(c);
});
r.put(
  "/qrs/:id/image",
  scope("qrs:write"),
  scope("images:write"),
  async (c) => {
    const qr = await getQrById(c.env.DB, c.req.param("id"), c.get("user").uid);
    if (!qr) return fail(c, "not_found", "QR not found", 404);
    if (qr.target_type !== "image")
      return fail(
        c,
        "target_type_mismatch",
        "This endpoint updates image QRs only",
        409,
      );
    return upload(c, qr.id);
  },
);
async function upload(c: import("hono").Context<AppEnv>, qrId?: string) {
  let file: File;
  const type = c.req.header("content-type") || "";
  try {
    if (type.startsWith("multipart/form-data")) {
      const item = (await c.req.formData()).get("file");
      if (!(item instanceof File))
        return fail(c, "invalid_input", "Missing file field", 400);
      file = item;
    } else if (
      [
        "image/png",
        "image/jpeg",
        "image/webp",
        "application/octet-stream",
      ].includes(type)
    ) {
      file = new File([await c.req.arrayBuffer()], "image", { type });
    } else
      return fail(
        c,
        "unsupported_media",
        "Send multipart file or PNG/JPEG/WebP bytes",
        415,
      );
  } catch {
    return fail(c, "invalid_input", "Malformed upload", 400);
  }
  let image;
  try {
    image = await saveImage(c.env, c.get("user").uid, file);
  } catch (e) {
    if (e instanceof Error && e.message === "image_size")
      return fail(c, "too_large", "Image must be 1 byte to 2 MiB", 413);
    if (e instanceof Error && e.message === "image_type")
      return fail(c, "unsupported_media", "Valid PNG/JPEG/WebP required", 415);
    throw e;
  }
  if (!qrId) return ok(c, { image }, 201);
  const qr = await updateQr(c.env.DB, qrId, c.get("user").uid, {
    target: {
      type: "image",
      payload: { r2_key: image.r2_key, mime: image.mime },
    },
  });
  if (!qr) {
    await c.env.IMAGES.delete(image.r2_key);
    return fail(c, "not_found", "QR not found", 404);
  }
  return ok(c, { qr: present(qr) });
}
r.all("*", (c) => fail(c, "not_found", "API endpoint not found", 404));
export default r;

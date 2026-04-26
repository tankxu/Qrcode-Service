import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { ok, fail } from "../lib/response";
import { newId } from "../lib/ids";
import type { AppEnv } from "../index";

const r = new Hono<AppEnv>();
r.use("*", requireAuth);

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_BYTES = 2 * 1024 * 1024;

// MVP: upload through Worker (simpler than R2 presigned PUT).
// Frontend sends multipart/form-data with a single "file" field.
r.post("/image", async (c) => {
  const user = c.get("user");
  const ct = c.req.header("content-type") || "";
  if (!ct.startsWith("multipart/form-data")) {
    return fail(c, "invalid_input", "Expected multipart/form-data", 400);
  }
  const fd = await c.req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) return fail(c, "invalid_input", "Missing file", 400);

  if (!ALLOWED.has(file.type)) {
    return fail(c, "unsupported_media", `Unsupported MIME ${file.type}`, 415);
  }
  if (file.size > MAX_BYTES) {
    return fail(c, "too_large", "File exceeds 2MB", 413);
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
  const key = `images/${user.uid}/${newId()}.${ext}`;

  await c.env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return ok(c, {
    r2_key: key,
    mime: file.type,
    size: file.size,
    public_url: `/r/${key}`,
  });
});

export default r;

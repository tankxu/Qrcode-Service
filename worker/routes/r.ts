import { Hono } from "hono";
import type { AppEnv } from "../index";

const r = new Hono<AppEnv>();

// Public R2 read proxy. Path mirrors the R2 key so an upload at
// images/<uid>/<id>.png is served at /r/images/<uid>/<id>.png
r.get("/*", async (c) => {
  const url = new URL(c.req.url);
  const key = url.pathname.replace(/^\/r\//, "");
  if (!key) return c.notFound();

  const obj = await c.env.IMAGES.get(key);
  if (!obj) return c.notFound();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=300, stale-while-revalidate=86400");
  return new Response(obj.body, { headers });
});

export default r;

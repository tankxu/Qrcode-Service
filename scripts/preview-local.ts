// Disposable local-only UI fixture. Never imported by or deployed with the Worker.
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { signJWT } from "../worker/jwt";
const bundle = await build({
  entryPoints: ["worker/index.ts"],
  write: false,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  tsconfig: "worker/tsconfig.json",
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    workers: [
      {
        name: "pandaqr",
        modules: true,
        script: bundle.outputFiles[0].text,
        compatibilityDate: "2025-01-15",
        compatibilityFlags: ["nodejs_compat"],
        d1Databases: ["DB"],
        r2Buckets: ["IMAGES"],
        kvNamespaces: ["CACHE"],
        bindings: {
          JWT_SECRET: "disposable-preview",
          APP_URL: "http://127.0.0.1:8788",
        },
        serviceBindings: {
          ASSETS: async (req) => {
            const path = resolve("dist", "." + new URL(req.url).pathname);
            if (!path.startsWith(resolve("dist") + "/"))
              return new Response(readFileSync("dist/index.html"), {
                headers: { "Content-Type": "text/html" },
              });
            let body: Buffer;
            let ext = extname(path);
            try {
              body = readFileSync(path);
            } catch {
              body = readFileSync("dist/index.html");
              ext = ".html";
            }
            return new Response(body, {
              headers: {
                "Content-Type":
                  {
                    ".html": "text/html",
                    ".js": "text/javascript",
                    ".css": "text/css",
                    ".png": "image/png",
                    ".json": "application/json",
                    ".woff2": "font/woff2",
                    ".md": "text/plain",
                  }[ext] || "application/octet-stream",
              },
            });
          },
        },
      },
    ],
  }),
);
const db = await mf.getD1Database("DB");
for (const name of readdirSync("worker/migrations").sort())
  for (const stmt of readFileSync("worker/migrations/" + name, "utf8")
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await db.prepare(stmt).run();
await db
  .prepare(
    "INSERT INTO users(id,google_sub,email,name,created_at,updated_at) VALUES(?,?,?,?,?,?)",
  )
  .bind(
    "preview",
    "preview",
    "demo@example.com",
    "PandaQR Demo",
    Date.now(),
    Date.now(),
  )
  .run();
const jwt = await signJWT(
  {
    uid: "preview",
    sub: "preview",
    email: "demo@example.com",
    name: "PandaQR Demo",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  },
  "disposable-preview",
);
const auth = {
  Cookie: "qr_session=" + jwt,
  Origin: "http://127.0.0.1:8788",
  "Content-Type": "application/json",
};
const tr = await mf.dispatchFetch("http://127.0.0.1:8788/api/tokens", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    name: "Community shortcut",
    scopes: ["qrs:read", "qrs:write", "images:write"],
    expires_in_days: 90,
  }),
});
const token = ((await tr.json()) as any).data.token;
writeFileSync("/tmp/pandaqr-preview-token", token, { mode: 0o600 });
const upload = await mf.dispatchFetch("http://127.0.0.1:8788/api/v1/images", {
  method: "POST",
  headers: { Authorization: "Bearer " + token, "Content-Type": "image/png" },
  body: readFileSync("public/images/logo.png"),
});
const image = ((await upload.json()) as any).data.image;
const qr = await mf.dispatchFetch("http://127.0.0.1:8788/api/v1/qrs", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    title: "微信群 · Community",
    target: {
      type: "image",
      payload: { r2_key: image.r2_key, mime: image.mime },
    },
  }),
});
writeFileSync(
  "/tmp/pandaqr-preview-qr",
  JSON.stringify(((await qr.json()) as any).data.qr),
  { mode: 0o600 },
);
createServer(async (req, res) => {
  try {
    const parts = [];
    for await (const part of req) parts.push(part);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
    headers.set("Cookie", "qr_session=" + jwt);
    const out = await mf.dispatchFetch("http://127.0.0.1:8788" + req.url, {
      method: req.method,
      headers,
      body: parts.length ? Buffer.concat(parts) : undefined,
    });
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Preview error");
  }
}).listen(8788, "127.0.0.1", () =>
  console.log("Disposable fixture: http://127.0.0.1:8788/developer"),
);

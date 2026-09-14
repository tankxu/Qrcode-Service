import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { signJWT } from "../worker/jwt";
import { hashToken } from "../worker/lib/tokens";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0uoAAAAASUVORK5CYII=",
  "base64",
);
test("PandaQR API and dashboard authorization against real local D1/R2", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "pandaqr-test-"));
  await build({
    entryPoints: ["worker/index.ts"],
    outfile: join(dir, "worker.mjs"),
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
          script: readFileSync(join(dir, "worker.mjs"), "utf8"),
          compatibilityDate: "2025-01-15",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          r2Buckets: ["IMAGES"],
          kvNamespaces: ["CACHE"],
          bindings: {
            JWT_SECRET: "local-test-secret",
            APP_URL: "http://localhost/",
          },
          serviceBindings: { ASSETS: () => new Response("asset") },
        },
      ],
    }),
  );
  try {
    const db = await mf.getD1Database("DB");
    for (const name of readdirSync("worker/migrations").sort()) {
      const sql = readFileSync("worker/migrations/" + name, "utf8").replace(
        /--[^\n]*/g,
        "",
      );
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await db.prepare(statement).run();
    }
    for (const id of ["alice", "bob"])
      await db
        .prepare(
          "INSERT INTO users(id,google_sub,email,created_at,updated_at) VALUES(?,?,?,?,?)",
        )
        .bind(id, id, id + "@test.local", Date.now(), Date.now())
        .run();
    const session = await signJWT(
      {
        uid: "alice",
        sub: "alice",
        email: "alice@test.local",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "local-test-secret",
    );
    const cookie = "qr_session=" + session;
    const request = async (
      path: string,
      method = "GET",
      body?: unknown,
      token?: string,
      extra: Record<string, string> = {},
    ) => {
      const headers: Record<string, string> = { ...extra };
      if (token) headers.Authorization = "Bearer " + token;
      let payload: any;
      if (body instanceof Uint8Array) {
        payload = body;
        headers["Content-Type"] ||= "image/png";
      } else if (body !== undefined) {
        payload = JSON.stringify(body);
        headers["Content-Type"] = "application/json";
      }
      const res = await mf.dispatchFetch("http://localhost" + path, {
        method,
        headers,
        body: payload,
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = { text };
      }
      return { status: res.status, headers: res.headers, json };
    };
    const createToken = async (scopes: string[], qr_id?: string) => {
      const r = await request(
        "/api/tokens",
        "POST",
        {
          name: "Test",
          scopes,
          expires_in_days: 7,
          ...(qr_id ? { qr_id } : {}),
        },
        undefined,
        { Cookie: cookie, Origin: "http://localhost" },
      );
      assert.equal(r.status, 201, JSON.stringify(r.json));
      return r.json.data;
    };
    await t.test(
      "session-only token creation and origin protection",
      async () => {
        assert.equal((await request("/api/tokens", "POST", {})).status, 401);
        assert.equal(
          (
            await request("/api/tokens", "POST", {}, undefined, {
              Cookie: cookie,
              Origin: "https://evil.example",
            })
          ).status,
          403,
        );
      },
    );
    const full = await createToken([
      "qrs:read",
      "qrs:write",
      "images:write",
      "qrs:delete",
    ]);
    await t.test(
      "hash-only storage, no secret on listing, bearer-only v1",
      async () => {
        const stored = await db
          .prepare("SELECT token_hash FROM access_tokens WHERE id=?")
          .bind(full.id)
          .first();
        assert.equal(stored!.token_hash, await hashToken(full.token));
        const list = await request("/api/tokens", "GET", undefined, undefined, {
          Cookie: cookie,
        });
        assert.ok(!JSON.stringify(list.json).includes(full.token));
        assert.ok(!JSON.stringify(list.json).includes("token_hash"));
        assert.equal(
          (
            await request("/api/v1/qrs", "GET", undefined, undefined, {
              Cookie: cookie,
            })
          ).status,
          401,
        );
        assert.equal(
          (await request("/api/tokens", "GET", undefined, full.token)).status,
          401,
        );
      },
    );
    const uploaded = await request("/api/v1/images", "POST", png, full.token);
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.json));
    const target = {
      type: "image",
      payload: { r2_key: uploaded.json.data.image.r2_key, mime: "image/png" },
    };
    const body = {
      title: "Community",
      target,
      expiry: { enabled: true, window_seconds: 604800 },
    };
    const created = await request("/api/v1/qrs", "POST", body, full.token, {
      "Idempotency-Key": "create-community",
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const qr = created.json.data.qr;
    await t.test(
      "create replay, conflict, pagination, unknown endpoints",
      async () => {
        const replay = await request("/api/v1/qrs", "POST", body, full.token, {
          "Idempotency-Key": "create-community",
        });
        assert.equal(replay.json.data.qr.id, qr.id);
        assert.equal(replay.headers.get("Idempotency-Replayed"), "true");
        assert.equal(
          (
            await request(
              "/api/v1/qrs",
              "POST",
              { ...body, title: "different" },
              full.token,
              { "Idempotency-Key": "create-community" },
            )
          ).status,
          409,
        );
        assert.equal(
          (await request("/api/v1/qrs?limit=bad", "GET", undefined, full.token))
            .status,
          400,
        );
        const second = await request(
          "/api/v1/qrs",
          "POST",
          {
            title: "Other",
            target: { type: "url", payload: { url: "https://example.com" } },
          },
          full.token,
        );
        assert.equal(second.status, 201);
        const page1 = await request(
          "/api/v1/qrs?limit=1",
          "GET",
          undefined,
          full.token,
        );
        assert.equal(page1.json.data.qrs.length, 1);
        assert.ok(page1.json.data.next_cursor);
        const page2 = await request(
          "/api/v1/qrs?limit=1&cursor=" + page1.json.data.next_cursor,
          "GET",
          undefined,
          full.token,
        );
        assert.notEqual(page1.json.data.qrs[0].id, page2.json.data.qrs[0].id);
        assert.equal(
          (await request("/api/v1/missing", "GET", undefined, full.token))
            .status,
          404,
        );
        assert.equal((await request("/api/unknown")).status, 404);
      },
    );
    const restricted = await createToken(
      ["qrs:read", "qrs:write", "images:write"],
      qr.id,
    );
    await t.test("single QR restriction and scope enforcement", async () => {
      assert.equal(
        (await request("/api/v1/qrs", "POST", body, restricted.token)).status,
        403,
      );
      assert.equal(
        (await request("/api/v1/images", "POST", png, restricted.token)).status,
        403,
      );
      assert.equal(
        (await request("/api/v1/qrs/other", "GET", undefined, restricted.token))
          .status,
        404,
      );
      assert.equal(
        (
          await request(
            "/api/v1/qrs/" + qr.id,
            "DELETE",
            undefined,
            restricted.token,
          )
        ).status,
        403,
      );
      assert.equal(
        (await request("/api/v1/qrs", "GET", undefined, restricted.token)).json
          .data.qrs.length,
        1,
      );
      const read = await createToken(["qrs:read"]);
      assert.equal(
        (
          await request(
            "/api/v1/qrs/" + qr.id,
            "PATCH",
            { title: "no" },
            read.token,
          )
        ).status,
        403,
      );
    });
    await t.test(
      "cross-account read/update/delete/upload attachment rejected",
      async () => {
        const bob = "pqr_live_" + "b".repeat(64);
        await db
          .prepare(
            "INSERT INTO access_tokens(id,user_id,name,token_hash,prefix,scopes,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?)",
          )
          .bind(
            "bob-token",
            "bob",
            "Bob",
            await hashToken(bob),
            "pqr_live_bbbb",
            JSON.stringify([
              "qrs:read",
              "qrs:write",
              "qrs:delete",
              "images:write",
            ]),
            Date.now(),
            Date.now() + 3600000,
          )
          .run();
        for (const method of ["GET", "PATCH", "DELETE"])
          assert.equal(
            (
              await request(
                "/api/v1/qrs/" + qr.id,
                method,
                method === "PATCH" ? { title: "hijack" } : undefined,
                bob,
              )
            ).status,
            404,
          );
        assert.equal(
          (await request("/api/v1/qrs", "POST", body, bob)).status,
          400,
        );
        assert.equal(
          (await request("/api/v1/qrs/" + qr.id + "/image", "PUT", png, bob))
            .status,
          404,
        );
      },
    );
    await t.test(
      "image replacement preserves scan URL and expiry refresh; no stale KV",
      async () => {
        await (
          await mf.getKVNamespace("CACHE")
        ).put("target:" + qr.slug, JSON.stringify({ status: "paused" }));
        const before = await request("/q/" + qr.slug);
        assert.equal(before.status, 200);
        const update = await request(
          "/api/v1/qrs/" + qr.id + "/image",
          "PUT",
          png,
          restricted.token,
          { "Idempotency-Key": "replace-1" },
        );
        assert.equal(update.status, 200, JSON.stringify(update.json));
        assert.equal(update.json.data.qr.scan_url, qr.scan_url);
        assert.notEqual(
          update.json.data.qr.target.payload.r2_key,
          qr.target.payload.r2_key,
        );
        assert.ok(update.json.data.qr.expiry.anchor_at >= qr.expiry.anchor_at);
        const after = await request("/q/" + qr.slug);
        assert.equal(after.headers.get("cache-control"), "no-store");
        assert.ok(
          after.json.text.includes(update.json.data.qr.target.payload.r2_key),
        );
        const replay = await request(
          "/api/v1/qrs/" + qr.id + "/image",
          "PUT",
          png,
          restricted.token,
          { "Idempotency-Key": "replace-1" },
        );
        assert.equal(
          replay.json.data.qr.target.payload.r2_key,
          update.json.data.qr.target.payload.r2_key,
        );
        assert.ok(
          await (await mf.getR2Bucket("IMAGES")).head(qr.target.payload.r2_key),
        );
      },
    );
    await t.test(
      "bad bytes, empty, oversized and malformed JSON rejected",
      async () => {
        assert.equal(
          (
            await request(
              "/api/v1/qrs/" + qr.id + "/image",
              "PUT",
              Buffer.from("not an image"),
              restricted.token,
            )
          ).status,
          415,
        );
        assert.equal(
          (
            await request(
              "/api/v1/qrs/" + qr.id + "/image",
              "PUT",
              Buffer.alloc(0),
              restricted.token,
            )
          ).status,
          413,
        );
        assert.equal(
          (
            await request(
              "/api/v1/qrs/" + qr.id + "/image",
              "PUT",
              Buffer.alloc(2 * 1024 * 1024 + 1),
              restricted.token,
            )
          ).status,
          413,
        );
        assert.equal(
          (await request("/api/v1/qrs/" + qr.id, "PATCH", {}, full.token))
            .status,
          400,
        );
        const bad = await mf.dispatchFetch("http://localhost/api/v1/qrs", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + full.token,
            "Content-Type": "application/json",
          },
          body: "{",
        });
        assert.equal(bad.status, 400);
      },
    );
    await t.test("rate limit, expiry and immediate revocation", async () => {
      await db
        .prepare(
          "INSERT OR REPLACE INTO api_rate_limits(token_id,window,count) VALUES(?,?,60)",
        )
        .bind(restricted.id, Math.floor(Date.now() / 60000))
        .run();
      const limited = await request(
        "/api/v1/qrs",
        "GET",
        undefined,
        restricted.token,
      );
      assert.equal(limited.status, 429);
      assert.ok(limited.headers.get("Retry-After"));
      await db
        .prepare("UPDATE access_tokens SET expires_at=0 WHERE id=?")
        .bind(restricted.id)
        .run();
      assert.equal(
        (await request("/api/v1/qrs", "GET", undefined, restricted.token))
          .status,
        401,
      );
      assert.equal(
        (
          await request(
            "/api/tokens/" + full.id,
            "DELETE",
            undefined,
            undefined,
            { Cookie: cookie, Origin: "http://localhost" },
          )
        ).status,
        200,
      );
      assert.equal(
        (await request("/api/v1/qrs", "GET", undefined, full.token)).status,
        401,
      );
    });
    const count = await db
      .prepare("SELECT COUNT(*) n FROM api_audit_events")
      .first();
    assert.ok(Number(count!.n) > 0);
  } finally {
    await mf.dispose();
    rmSync(dir, { recursive: true, force: true });
  }
});

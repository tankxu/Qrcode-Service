import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { signJWT, verifyJWT, randomToken, type SessionPayload } from "./jwt";
import { upsertUser } from "./lib/db";
import { SESSION_COOKIE, type AuthedUser } from "./lib/auth";

export type Bindings = {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  OAUTH_REDIRECT_URI: string;
  APP_URL: string;
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  SCAN_EVENTS: AnalyticsEngineDataset;
};

export type AppEnv = { Bindings: Bindings; Variables: { user: AuthedUser } };

const STATE_COOKIE = "qr_oauth_state";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const app = new Hono<AppEnv>();

app.get("/api/auth/google", (c) => {
  const state = randomToken();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", c.env.OAUTH_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");

  setCookie(c, STATE_COOKIE, state, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(url.toString(), 302);
});

app.get("/api/auth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieState = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: "/" });

  if (!code || !state || !cookieState || state !== cookieState) {
    return c.text("Invalid OAuth state", 400);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: c.env.OAUTH_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return c.text(`Token exchange failed: ${await tokenRes.text()}`, 502);
  }

  const tokenJson = (await tokenRes.json()) as { access_token?: string; id_token?: string };
  if (!tokenJson.access_token) return c.text("Missing access_token", 502);

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userRes.ok) return c.text("Failed to fetch userinfo", 502);

  const user = (await userRes.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };

  const dbUser = await upsertUser(c.env.DB, {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
  });

  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: dbUser.id,
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const jwt = await signJWT(payload, c.env.JWT_SECRET);
  const isHttps = new URL(c.req.url).protocol === "https:";

  setCookie(c, SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return c.redirect(c.env.APP_URL || "/", 302);
});

app.get("/api/auth/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ user: null });
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ user: null });
  }
  return c.json({
    user: {
      uid: payload.uid,
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    },
  });
});

app.post("/api/auth/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// Placeholder for Phase D — landing page SSR.
app.get("/q/:slug", (c) => {
  const slug = c.req.param("slug");
  return c.html(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QuickQR</title></head><body><h1>Hello ${slug}</h1><p>Landing page SSR — coming in Phase D.</p></body></html>`,
  );
});

export default app satisfies ExportedHandler<Bindings>;

import type { MiddlewareHandler } from "hono";
import { getCookie, deleteCookie } from "hono/cookie";
import { verifyJWT } from "../jwt";
import { fail } from "./response";

export const SESSION_COOKIE = "qr_session";

export interface AuthedUser {
  uid: string;       // D1 users.id
  sub: string;       // google sub
  email: string;
  name?: string;
  picture?: string;
}

export const requireAuth: MiddlewareHandler<{
  Bindings: { JWT_SECRET: string };
  Variables: { user: AuthedUser };
}> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return fail(c, "unauthenticated", "Sign in required", 401);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);
  if (!payload || !payload.uid) {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return fail(c, "unauthenticated", "Session expired", 401);
  }
  c.set("user", {
    uid: payload.uid,
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  });
  await next();
};

import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { ok, fail } from "../lib/response";
import {
  countUnreadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "../lib/db";
import type { AppEnv } from "../index";

const r = new Hono<AppEnv>();

r.use("*", requireAuth);

const present = (n: NotificationRow) => ({
  id: n.id,
  qr_id: n.qr_id,
  type: n.type,
  kind: n.kind,
  title: n.title,
  body: n.body,
  read_at: n.read_at,
  created_at: n.created_at,
});

r.get("/", async (c) => {
  const user = c.get("user");
  const [items, unread] = await Promise.all([
    listNotifications(c.env.DB, user.uid, 50),
    countUnreadNotifications(c.env.DB, user.uid),
  ]);
  return ok(c, { notifications: items.map(present), unread });
});

r.post("/:id/read", async (c) => {
  const user = c.get("user");
  const updated = await markNotificationRead(c.env.DB, user.uid, c.req.param("id"));
  if (!updated) return fail(c, "not_found", "Notification not found", 404);
  return ok(c, { read: true });
});

r.post("/read-all", async (c) => {
  const user = c.get("user");
  const n = await markAllNotificationsRead(c.env.DB, user.uid);
  return ok(c, { read: n });
});

export default r;

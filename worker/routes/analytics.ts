import { Hono } from "hono";
import { requireAuth } from "../lib/auth";
import { ok, fail } from "../lib/response";
import { getQrById, getDailyScans } from "../lib/db";
import type { AppEnv } from "../index";

const r = new Hono<AppEnv>();
r.use("*", requireAuth);

r.get("/:id/analytics", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const range = c.req.query("range") || "7d";
  const days = range === "30d" ? 30 : 7;

  const qr = await getQrById(c.env.DB, id, user.uid);
  if (!qr) return fail(c, "not_found", "QR not found", 404);

  const rows = await getDailyScans(c.env.DB, id, days);
  // Fill missing days with 0 for a contiguous series.
  const series: { day: string; count: number }[] = [];
  const map = new Map(rows.map((r) => [r.day, r.count]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    series.push({ day: d, count: map.get(d) ?? 0 });
  }

  return ok(c, {
    total: qr.scan_total,
    last_scan_at: qr.last_scan_at,
    range_days: days,
    daily: series,
  });
});

export default r;

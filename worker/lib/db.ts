import { newId, generateSlug } from "./ids";
import type { TargetInput } from "./schemas";

export interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  is_seed: number;
  created_at: number;
  updated_at: number;
}

export interface QrRow {
  id: string;
  slug: string;
  user_id: string;
  title: string | null;
  description: string | null;
  note: string | null;
  status: "active" | "paused";
  target_type: "image" | "url" | "multilink";
  target_payload: string;
  expiry_enabled: number;
  expiry_window_seconds: number | null;
  expiry_anchor_at: number | null;
  expiry_lead_times: string | null;
  expiry_action: "keep" | "pause";
  created_at: number;
  updated_at: number;
}

export interface ExpiryInput {
  enabled: boolean;
  window_seconds?: number;
  lead_times?: number[];
  action?: "keep" | "pause";
}

export interface QrWithCounter extends QrRow {
  scan_total: number;
  last_scan_at: number | null;
}

const now = () => Date.now();

export async function upsertUser(
  db: D1Database,
  google: { sub: string; email: string; name?: string; picture?: string },
): Promise<UserRow> {
  const existing = await db
    .prepare("SELECT * FROM users WHERE google_sub = ?")
    .bind(google.sub)
    .first<UserRow>();

  if (existing) {
    const updated = now();
    await db
      .prepare(
        "UPDATE users SET email = ?, name = ?, picture = ?, updated_at = ? WHERE id = ?",
      )
      .bind(google.email, google.name ?? null, google.picture ?? null, updated, existing.id)
      .run();
    return { ...existing, email: google.email, name: google.name ?? null, picture: google.picture ?? null, updated_at: updated };
  }

  const ts = now();
  const id = newId();
  await db
    .prepare(
      "INSERT INTO users (id, google_sub, email, name, picture, is_seed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    )
    .bind(id, google.sub, google.email, google.name ?? null, google.picture ?? null, ts, ts)
    .run();
  return {
    id,
    google_sub: google.sub,
    email: google.email,
    name: google.name ?? null,
    picture: google.picture ?? null,
    is_seed: 0,
    created_at: ts,
    updated_at: ts,
  };
}

export async function getUserById(db: D1Database, id: string): Promise<UserRow | null> {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

export async function listUserQrs(db: D1Database, userId: string): Promise<QrWithCounter[]> {
  const res = await db
    .prepare(
      `SELECT q.*, COALESCE(c.total, 0) AS scan_total, c.last_scan_at
       FROM qrs q LEFT JOIN scan_counters c ON c.qr_id = q.id
       WHERE q.user_id = ? ORDER BY q.updated_at DESC`,
    )
    .bind(userId)
    .all<QrWithCounter>();
  return res.results ?? [];
}

export async function getQrById(db: D1Database, id: string, userId: string): Promise<QrWithCounter | null> {
  return db
    .prepare(
      `SELECT q.*, COALESCE(c.total, 0) AS scan_total, c.last_scan_at
       FROM qrs q LEFT JOIN scan_counters c ON c.qr_id = q.id
       WHERE q.id = ? AND q.user_id = ?`,
    )
    .bind(id, userId)
    .first<QrWithCounter>();
}

export async function getQrBySlug(db: D1Database, slug: string): Promise<QrRow | null> {
  return db.prepare("SELECT * FROM qrs WHERE slug = ?").bind(slug).first<QrRow>();
}

const DEFAULT_LEAD_TIMES = [86400, 3 * 86400]; // 24h + 3d

function normalizeExpiry(input?: ExpiryInput): {
  enabled: number;
  window_seconds: number | null;
  lead_times: string | null;
  action: "keep" | "pause";
} {
  if (!input || !input.enabled || !input.window_seconds) {
    return { enabled: 0, window_seconds: null, lead_times: null, action: "keep" };
  }
  const leads = (input.lead_times && input.lead_times.length > 0 ? input.lead_times : DEFAULT_LEAD_TIMES)
    .filter((s) => s > 0 && s < input.window_seconds!)
    .sort((a, b) => b - a); // largest (earliest) first
  return {
    enabled: 1,
    window_seconds: input.window_seconds,
    lead_times: JSON.stringify(leads),
    action: input.action ?? "keep",
  };
}

export async function createQr(
  db: D1Database,
  userId: string,
  input: { title?: string; description?: string; note?: string; target: TargetInput; expiry?: ExpiryInput },
): Promise<QrRow> {
  const id = newId();
  const ts = now();
  let slug = generateSlug();
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await getQrBySlug(db, slug);
    if (!existing) break;
    if (attempt === 3) throw new Error("slug_collision");
    slug = generateSlug();
  }

  const targetType = input.target.type;
  const targetPayload = JSON.stringify(input.target.payload);
  const exp = normalizeExpiry(input.expiry);
  const anchor = exp.enabled ? ts : null;

  await db
    .prepare(
      `INSERT INTO qrs (id, slug, user_id, title, description, note, status, target_type, target_payload,
                        expiry_enabled, expiry_window_seconds, expiry_anchor_at, expiry_lead_times, expiry_action,
                        created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id, slug, userId,
      input.title ?? null, input.description ?? null, input.note ?? null,
      targetType, targetPayload,
      exp.enabled, exp.window_seconds, anchor, exp.lead_times, exp.action,
      ts, ts,
    )
    .run();

  await db.prepare("INSERT INTO scan_counters (qr_id, total, last_scan_at) VALUES (?, 0, NULL)").bind(id).run();

  return {
    id,
    slug,
    user_id: userId,
    title: input.title ?? null,
    description: input.description ?? null,
    note: input.note ?? null,
    status: "active",
    target_type: targetType,
    target_payload: targetPayload,
    expiry_enabled: exp.enabled,
    expiry_window_seconds: exp.window_seconds,
    expiry_anchor_at: anchor,
    expiry_lead_times: exp.lead_times,
    expiry_action: exp.action,
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateQr(
  db: D1Database,
  id: string,
  userId: string,
  patch: {
    title?: string;
    description?: string;
    note?: string | null;
    status?: "active" | "paused";
    target?: TargetInput;
    expiry?: ExpiryInput;
  },
): Promise<QrWithCounter | null> {
  const existing = await getQrById(db, id, userId);
  if (!existing) return null;

  const ts = now();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (patch.title !== undefined) { updates.push("title = ?"); values.push(patch.title); }
  if (patch.description !== undefined) { updates.push("description = ?"); values.push(patch.description); }
  if (patch.note !== undefined) { updates.push("note = ?"); values.push(patch.note); }
  if (patch.status !== undefined) { updates.push("status = ?"); values.push(patch.status); }

  // Replacing the target counts as "fresh content" — reset the expiry anchor
  // so the countdown restarts. Cancel any reminders pegged to the old anchor.
  let anchorReset = false;
  if (patch.target !== undefined) {
    updates.push("target_type = ?"); values.push(patch.target.type);
    updates.push("target_payload = ?"); values.push(JSON.stringify(patch.target.payload));
    if (existing.expiry_enabled) {
      updates.push("expiry_anchor_at = ?"); values.push(ts);
      anchorReset = true;
    }
  }

  if (patch.expiry !== undefined) {
    const exp = normalizeExpiry(patch.expiry);
    updates.push("expiry_enabled = ?"); values.push(exp.enabled);
    updates.push("expiry_window_seconds = ?"); values.push(exp.window_seconds);
    updates.push("expiry_lead_times = ?"); values.push(exp.lead_times);
    updates.push("expiry_action = ?"); values.push(exp.action);
    // Anchor logic: enabling = anchor at now (unless target update already did it).
    // Disabling = clear anchor.
    if (!exp.enabled) {
      updates.push("expiry_anchor_at = ?"); values.push(null);
    } else if (!existing.expiry_enabled || !existing.expiry_anchor_at) {
      // Newly enabled. Anchor = now.
      if (!anchorReset) { updates.push("expiry_anchor_at = ?"); values.push(ts); }
    }
    // (Keep existing anchor if expiry stays enabled and target wasn't replaced.)
  }

  if (updates.length === 0) return existing;
  updates.push("updated_at = ?"); values.push(ts);
  values.push(id, userId);

  await db
    .prepare(`UPDATE qrs SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...values)
    .run();

  return getQrById(db, id, userId);
}

export async function deleteQr(db: D1Database, id: string, userId: string): Promise<QrRow | null> {
  const existing = await db
    .prepare("SELECT * FROM qrs WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<QrRow>();
  if (!existing) return null;
  await db.prepare("DELETE FROM qrs WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return existing;
}

export async function incrementScan(db: D1Database, qrId: string): Promise<void> {
  const ts = now();
  await db
    .prepare(
      `UPDATE scan_counters SET total = total + 1, last_scan_at = ? WHERE qr_id = ?`,
    )
    .bind(ts, qrId)
    .run();
}

export async function bumpDaily(db: D1Database, qrId: string, dayKey: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO scan_daily (qr_id, day, count) VALUES (?, ?, 1)
       ON CONFLICT(qr_id, day) DO UPDATE SET count = count + 1`,
    )
    .bind(qrId, dayKey)
    .run();
}

export async function getDailyScans(db: D1Database, qrId: string, days: number): Promise<{ day: string; count: number }[]> {
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const res = await db
    .prepare(`SELECT day, count FROM scan_daily WHERE qr_id = ? AND day >= ? ORDER BY day ASC`)
    .bind(qrId, since)
    .all<{ day: string; count: number }>();
  return res.results ?? [];
}

// ---------- Notifications ----------

export interface NotificationRow {
  id: string;
  user_id: string;
  qr_id: string | null;
  type: string;
  kind: string | null;
  anchor_at: number | null;
  title: string;
  body: string | null;
  read_at: number | null;
  created_at: number;
}

export async function listNotifications(db: D1Database, userId: string, limit = 50): Promise<NotificationRow[]> {
  const res = await db
    .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`)
    .bind(userId, limit)
    .all<NotificationRow>();
  return res.results ?? [];
}

export async function countUnreadNotifications(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`)
    .bind(userId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function markNotificationRead(db: D1Database, userId: string, id: string): Promise<boolean> {
  const ts = now();
  const res = await db
    .prepare(`UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`)
    .bind(ts, id, userId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function markAllNotificationsRead(db: D1Database, userId: string): Promise<number> {
  const ts = now();
  const res = await db
    .prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`)
    .bind(ts, userId)
    .run();
  return res.meta?.changes ?? 0;
}

export async function insertNotification(
  db: D1Database,
  n: {
    id: string;
    user_id: string;
    qr_id: string | null;
    type: string;
    kind?: string | null;
    anchor_at?: number | null;
    title: string;
    body?: string | null;
  },
): Promise<boolean> {
  const ts = now();
  try {
    const res = await db
      .prepare(
        `INSERT INTO notifications (id, user_id, qr_id, type, kind, anchor_at, title, body, read_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      )
      .bind(
        n.id, n.user_id, n.qr_id ?? null, n.type,
        n.kind ?? null, n.anchor_at ?? null,
        n.title, n.body ?? null, ts,
      )
      .run();
    return (res.meta?.changes ?? 0) > 0;
  } catch (e) {
    // Unique-index collision (idx_notif_dedup) → already fired this lead, skip silently.
    if (e instanceof Error && /UNIQUE constraint/i.test(e.message)) return false;
    throw e;
  }
}

// ---------- Expiry sweep (cron) ----------

export interface QrExpiryRow {
  id: string;
  user_id: string;
  title: string | null;
  slug: string;
  status: "active" | "paused";
  expiry_anchor_at: number;
  expiry_window_seconds: number;
  expiry_lead_times: string | null;
  expiry_action: "keep" | "pause";
}

export async function listActiveExpiryQrs(db: D1Database): Promise<QrExpiryRow[]> {
  const res = await db
    .prepare(
      `SELECT id, user_id, title, slug, status, expiry_anchor_at, expiry_window_seconds, expiry_lead_times, expiry_action
       FROM qrs
       WHERE expiry_enabled = 1 AND status = 'active' AND expiry_anchor_at IS NOT NULL AND expiry_window_seconds IS NOT NULL`,
    )
    .all<QrExpiryRow>();
  return res.results ?? [];
}

export async function setQrPaused(db: D1Database, qrId: string): Promise<void> {
  const ts = now();
  await db
    .prepare(`UPDATE qrs SET status = 'paused', updated_at = ? WHERE id = ?`)
    .bind(ts, qrId)
    .run();
}

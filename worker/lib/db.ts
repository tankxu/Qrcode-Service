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
  created_at: number;
  updated_at: number;
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

export async function createQr(
  db: D1Database,
  userId: string,
  input: { title?: string; description?: string; note?: string; target: TargetInput },
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

  await db
    .prepare(
      `INSERT INTO qrs (id, slug, user_id, title, description, note, status, target_type, target_payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
    )
    .bind(id, slug, userId, input.title ?? null, input.description ?? null, input.note ?? null, targetType, targetPayload, ts, ts)
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
    created_at: ts,
    updated_at: ts,
  };
}

export async function updateQr(
  db: D1Database,
  id: string,
  userId: string,
  patch: { title?: string; description?: string; note?: string | null; status?: "active" | "paused"; target?: TargetInput },
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
  if (patch.target !== undefined) {
    updates.push("target_type = ?"); values.push(patch.target.type);
    updates.push("target_payload = ?"); values.push(JSON.stringify(patch.target.payload));
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

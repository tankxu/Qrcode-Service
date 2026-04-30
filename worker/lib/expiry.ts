import { newId } from "./ids";
import { insertNotification, listActiveExpiryQrs, setQrPaused, type QrExpiryRow } from "./db";

// Cron runs every hour. We need a slack window so a reminder that becomes due
// between two ticks isn't missed. 70 minutes is comfortable; the dedup unique
// index on (qr_id, anchor_at, kind) ensures we never double-fire even if the
// window overlaps adjacent runs.
const CRON_SLACK_MS = 70 * 60_000;

interface DueReminder {
  qr: QrExpiryRow;
  kind: string;            // lead_<seconds> | expired
  type: "expiry_lead" | "expiry_expired";
}

function leadKindKey(seconds: number): string {
  // Pretty key for human-readable kind values. Falls back to lead_<seconds>.
  if (seconds === 86400) return "lead_24h";
  if (seconds === 3 * 86400) return "lead_3d";
  if (seconds === 7 * 86400) return "lead_7d";
  return `lead_${seconds}s`;
}

export function planDueReminders(rows: QrExpiryRow[], nowMs: number): DueReminder[] {
  const due: DueReminder[] = [];
  const windowStart = nowMs - CRON_SLACK_MS;
  for (const qr of rows) {
    const expiresAt = qr.expiry_anchor_at + qr.expiry_window_seconds * 1000;

    // Lead-time reminders (e.g. 24h / 3d before expiry).
    let leads: number[] = [];
    if (qr.expiry_lead_times) {
      try {
        const parsed = JSON.parse(qr.expiry_lead_times);
        if (Array.isArray(parsed)) leads = parsed.filter((x) => typeof x === "number" && x > 0);
      } catch {}
    }
    for (const seconds of leads) {
      const fireAt = expiresAt - seconds * 1000;
      if (fireAt <= nowMs && fireAt > windowStart) {
        due.push({ qr, kind: leadKindKey(seconds), type: "expiry_lead" });
      }
    }

    // Expired notification — fires once at or after expiry time.
    if (expiresAt <= nowMs && expiresAt > windowStart) {
      due.push({ qr, kind: "expired", type: "expiry_expired" });
    }
  }
  return due;
}

function leadCopy(seconds: number): { en: string } {
  if (seconds === 86400) return { en: "in about 24 hours" };
  if (seconds === 3 * 86400) return { en: "in 3 days" };
  if (seconds === 7 * 86400) return { en: "in 7 days" };
  const days = Math.round(seconds / 86400);
  return { en: days >= 1 ? `in about ${days} days` : `in ${Math.round(seconds / 3600)} hours` };
}

function buildTitleAndBody(d: DueReminder): { title: string; body: string } {
  const name = d.qr.title || `/q/${d.qr.slug}`;
  if (d.type === "expiry_lead") {
    const seconds = d.kind.startsWith("lead_") && d.kind.endsWith("s")
      ? parseInt(d.kind.slice(5, -1), 10)
      : (d.kind === "lead_24h" ? 86400 : d.kind === "lead_3d" ? 3 * 86400 : d.kind === "lead_7d" ? 7 * 86400 : 0);
    const when = leadCopy(seconds || 0).en;
    return {
      title: `"${name}" expires ${when}`,
      body: `The content behind this QR is scheduled to expire ${when}. Open the detail page to refresh it before then.`,
    };
  }
  return {
    title: `"${name}" has expired`,
    body: `The content countdown for this QR has reached zero. Open the detail page to upload fresh content.`,
  };
}

export async function runExpirySweep(db: D1Database, nowMs = Date.now()): Promise<{ fired: number }> {
  const rows = await listActiveExpiryQrs(db);
  const due = planDueReminders(rows, nowMs);
  let fired = 0;
  for (const d of due) {
    const { title, body } = buildTitleAndBody(d);
    const inserted = await insertNotification(db, {
      id: newId(),
      user_id: d.qr.user_id,
      qr_id: d.qr.id,
      type: d.type,
      kind: d.kind,
      anchor_at: d.qr.expiry_anchor_at,
      title,
      body,
    });
    if (inserted) fired++;
    if (inserted && d.type === "expiry_expired" && d.qr.expiry_action === "pause") {
      await setQrPaused(db, d.qr.id);
    }
  }
  return { fired };
}

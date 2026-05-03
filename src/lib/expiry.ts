import type { ExpiryConfig } from "./api";

export type ExpiryStatus =
  | { kind: "off" }
  | { kind: "ok"; daysLeft: number; expiresAt: number }            // > 48h
  | { kind: "soon"; hoursLeft: number; expiresAt: number }         // 24-48h
  | { kind: "imminent"; hoursLeft: number; expiresAt: number }     // < 24h
  | { kind: "expired"; expiresAt: number };

export function expiryStatus(cfg: ExpiryConfig, now = Date.now()): ExpiryStatus {
  if (!cfg.enabled) return { kind: "off" };
  const expiresAt = cfg.anchor_at + cfg.window_seconds * 1000;
  const ms = expiresAt - now;
  if (ms <= 0) return { kind: "expired", expiresAt };
  const hours = ms / 3_600_000;
  if (hours < 24) return { kind: "imminent", hoursLeft: Math.max(1, Math.round(hours)), expiresAt };
  if (hours < 48) return { kind: "soon", hoursLeft: Math.round(hours), expiresAt };
  return { kind: "ok", daysLeft: Math.round(hours / 24), expiresAt };
}

import type { Context } from "hono";

export const ok = <T>(c: Context, data: T, status = 200) =>
  c.json({ ok: true, data }, status as 200);

export const fail = (
  c: Context,
  code: string,
  message: string,
  status = 400,
) => c.json({ ok: false, error: { code, message } }, status as 400);

export interface ApiOk<T> { ok: true; data: T }
export interface ApiErr { ok: false; error: { code: string; message: string } }
export type ApiResp<T> = ApiOk<T> | ApiErr;

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const headers = new Headers(init?.headers || {});
  let body: BodyInit | null | undefined = init?.body as BodyInit | null | undefined;
  if (init?.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, {
    method: init?.method || (init?.json !== undefined ? "POST" : "GET"),
    credentials: "include",
    headers,
    body,
  });
  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    throw new ApiError("invalid_response", `Bad response (${res.status})`, res.status);
  }
  const parsed = raw as ApiResp<T>;
  if ("error" in parsed) {
    throw new ApiError(parsed.error.code, parsed.error.message, res.status);
  }
  return parsed.data;
}

export type TargetType = "image" | "url" | "multilink";

export interface Qr {
  id: string;
  slug: string;
  title: string | null;
  description: string | null;
  note: string | null;
  status: "active" | "paused";
  target: { type: TargetType; payload: unknown };
  scan_total: number;
  last_scan_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ImagePayload { r2_key: string; mime: string; width?: number; height?: number }
export interface UrlPayload { url: string }
export interface MultilinkPayload { title?: string; description?: string; items: { label: string; url: string }[] }

export interface Analytics {
  total: number;
  last_scan_at: number | null;
  range_days: number;
  daily: { day: string; count: number }[];
}

export const qrsApi = {
  list: () => api<{ qrs: Qr[] }>("/api/qrs"),
  get: (id: string) => api<{ qr: Qr }>(`/api/qrs/${id}`),
  analytics: (id: string, range: "7d" | "30d" = "7d") =>
    api<Analytics>(`/api/qrs/${id}/analytics?range=${range}`),
  create: (input: { title?: string; description?: string; note?: string; target: Qr["target"] }) =>
    api<{ qr: Qr }>("/api/qrs", { json: input }),
  update: (id: string, patch: Partial<Pick<Qr, "title" | "description" | "note" | "status">> & { target?: Qr["target"] }) =>
    api<{ qr: Qr }>(`/api/qrs/${id}`, { method: "PATCH", json: patch }),
  remove: (id: string) => api<{ deleted: true }>(`/api/qrs/${id}`, { method: "DELETE" }),
  uploadImage: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads/image", { method: "POST", credentials: "include", body: fd });
    const json = await res.json();
    if (!json.ok) throw new ApiError(json.error.code, json.error.message, res.status);
    return json.data as { r2_key: string; mime: string; size: number; public_url: string };
  },
};

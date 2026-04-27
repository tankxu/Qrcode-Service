import { Hono } from "hono";
import { getQrBySlug, incrementScan, bumpDaily } from "../lib/db";
import { ImageView } from "../views/Image";
import { UrlView } from "../views/Url";
import { MultilinkView } from "../views/Multilink";
import { ErrorView } from "../views/Error";
import type { AppEnv } from "../index";

interface CachedTarget {
  qr_id: string;
  status: "active" | "paused";
  title: string | null;
  description: string | null;
  target_type: "image" | "url" | "multilink";
  target_payload: unknown;
}

function pickLocale(req: Request): "en" | "zh-CN" {
  const al = (req.headers.get("accept-language") || "").toLowerCase();
  if (al.startsWith("zh") || al.includes("zh-cn") || al.includes("zh_cn")) return "zh-CN";
  return "en";
}

const r = new Hono<AppEnv>();

r.get("/:slug", async (c) => {
  const slug = c.req.param("slug");
  const locale = pickLocale(c.req.raw);

  // KV cache (TTL 60s)
  let cached: CachedTarget | null = null;
  try {
    const hit = await c.env.CACHE.get(`target:${slug}`, "json");
    if (hit) cached = hit as CachedTarget;
  } catch {}

  if (!cached) {
    const row = await getQrBySlug(c.env.DB, slug);
    if (!row) {
      c.status(404);
      return c.html(<ErrorView kind="not_found" locale={locale} />);
    }
    cached = {
      qr_id: row.id,
      status: row.status,
      title: row.title,
      description: row.description,
      target_type: row.target_type,
      target_payload: JSON.parse(row.target_payload),
    };
    c.executionCtx.waitUntil(
      c.env.CACHE.put(`target:${slug}`, JSON.stringify(cached), { expirationTtl: 60 }),
    );
  }

  if (cached.status === "paused") {
    c.status(410);
    return c.html(<ErrorView kind="paused" locale={locale} />);
  }

  // Async scan tracking — never block render
  const qrId = cached.qr_id;
  const today = new Date().toISOString().slice(0, 10);
  const country = (c.req.raw as Request & { cf?: { country?: string } }).cf?.country ?? "XX";
  c.executionCtx.waitUntil(
    Promise.allSettled([
      incrementScan(c.env.DB, qrId),
      bumpDaily(c.env.DB, qrId, today),
      c.env.SCAN_EVENTS
        ? Promise.resolve(
            c.env.SCAN_EVENTS.writeDataPoint({
              blobs: [qrId, country],
              doubles: [1],
              indexes: [qrId],
            }),
          )
        : Promise.resolve(),
    ]),
  );

  c.header("cache-control", "public, max-age=60, stale-while-revalidate=600");

  switch (cached.target_type) {
    case "image": {
      const p = cached.target_payload as { r2_key: string };
      return c.html(
        <ImageView imageUrl={`/r/${p.r2_key}`} title={cached.title} description={cached.description} locale={locale} />,
      );
    }
    case "url": {
      const p = cached.target_payload as { url: string };
      return c.html(<UrlView url={p.url} locale={locale} />);
    }
    case "multilink": {
      const p = cached.target_payload as { title?: string; description?: string; items: { label: string; url: string }[] };
      return c.html(
        <MultilinkView
          title={p.title || cached.title}
          description={p.description || cached.description}
          items={p.items}
          locale={locale}
        />,
      );
    }
  }
});

export default r;

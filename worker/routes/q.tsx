import { Hono } from "hono";
import { getQrBySlug, incrementScan, bumpDaily } from "../lib/db";
import { ImageView } from "../views/Image";
import { UrlView } from "../views/Url";
import { MultilinkView } from "../views/Multilink";
import { ErrorView } from "../views/Error";
import { pickLocale, strings } from "../lib/i18n";
import type { AppEnv } from "../index";

interface CachedTarget {
  qr_id: string;
  status: "active" | "paused";
  title: string | null;
  description: string | null;
  note: string | null;
  target_type: "image" | "url" | "multilink";
  target_payload: unknown;
  expires_at: number | null;          // unix ms; null when expiry disabled
}

const r = new Hono<AppEnv>();

r.get("/:slug", async (c) => {
  c.header("cache-control", "no-store");
  const slug = c.req.param("slug");
  const locale = pickLocale(c.req.raw);
  const s = strings(locale);

  // Read D1 directly so updates are visible on the next scan across regions.
  let cached: CachedTarget;
  {
    const row = await getQrBySlug(c.env.DB, slug);
    if (!row) {
      c.status(404);
      return c.html(<ErrorView kind="not_found" locale={locale} s={s} />);
    }
    const expiresAt =
      row.expiry_enabled && row.expiry_anchor_at && row.expiry_window_seconds
        ? row.expiry_anchor_at + row.expiry_window_seconds * 1000
        : null;
    cached = {
      qr_id: row.id,
      status: row.status,
      title: row.title,
      description: row.description,
      note: row.note,
      target_type: row.target_type,
      target_payload: JSON.parse(row.target_payload),
      expires_at: expiresAt,
    };
  }

  if (cached.status === "paused") {
    c.status(410);
    return c.html(<ErrorView kind="paused" locale={locale} s={s} />);
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


  const expired = cached.expires_at !== null && Date.now() >= cached.expires_at;

  switch (cached.target_type) {
    case "image": {
      const p = cached.target_payload as { r2_key: string };
      return c.html(
        <ImageView
          imageUrl={`/r/${p.r2_key}`}
          title={cached.title}
          description={cached.description}
          note={cached.note}
          expired={expired}
          locale={locale}
          s={s}
        />,
      );
    }
    case "url": {
      const p = cached.target_payload as { url: string };
      return c.html(<UrlView url={p.url} note={cached.note} expired={expired} locale={locale} s={s} />);
    }
    case "multilink": {
      const p = cached.target_payload as { title?: string; description?: string; items: { label: string; url: string }[] };
      return c.html(
        <MultilinkView
          title={p.title || cached.title}
          description={p.description || cached.description}
          items={p.items}
          note={cached.note}
          expired={expired}
          locale={locale}
          s={s}
        />,
      );
    }
  }
});

export default r;

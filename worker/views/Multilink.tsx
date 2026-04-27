import type { FC } from "hono/jsx";
import { Layout } from "./Layout";
import type { Locale, Strings } from "../lib/i18n";

interface Props {
  title?: string | null;
  description?: string | null;
  items: { label: string; url: string }[];
  locale: Locale;
  s: Strings;
}

export const MultilinkView: FC<Props> = ({ title, description, items, locale, s }) => {
  return (
    <Layout lang={locale} title={title || "QuickQR"} description={description || undefined}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:24px">
            {title && <h1 class="title" style="text-align:center;margin-bottom:8px">{title}</h1>}
            {description && <p class="desc" style="text-align:center;margin-bottom:24px">{description}</p>}
            <div style="display:flex;flex-direction:column;gap:10px">
              {items.map((it) => (
                <a
                  href={it.url}
                  rel="noopener noreferrer"
                  class="btn btn-secondary"
                  style="width:100%;justify-content:space-between"
                >
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{it.label}</span>
                  <span style="opacity:.4">→</span>
                </a>
              ))}
            </div>
          </div>
          <div class="brand">
            <span class="brand-logo">Q</span>
            <span>{s.poweredBy}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

import type { FC } from "hono/jsx";
import { Layout } from "./Layout";

interface Props {
  title?: string | null;
  description?: string | null;
  items: { label: string; url: string }[];
  locale: "en" | "zh-CN";
}

const t = {
  "en": { poweredBy: "Powered by QuickQR" },
  "zh-CN": { poweredBy: "由 QuickQR 提供" },
};

export const MultilinkView: FC<Props> = ({ title, description, items, locale }) => {
  const tt = t[locale];
  return (
    <Layout title={title || "QuickQR"} description={description || undefined}>
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
            <span>{tt.poweredBy}</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

import type { FC } from "hono/jsx";
import { Layout } from "./Layout";
import type { Locale, Strings } from "../lib/i18n";

interface Props {
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  locale: Locale;
  s: Strings;
}

export const ImageView: FC<Props> = ({ imageUrl, title, description, locale, s }) => {
  return (
    <Layout lang={locale} title={title || "QuickQR"} description={description || undefined} ogImage={imageUrl}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:20px">
            {title && <h1 class="title">{title}</h1>}
            {description && <p class="desc">{description}</p>}
            <img src={imageUrl} alt={title || ""} style="width:100%;border-radius:12px;background:#f1f5f9" />
            <p class="muted" style="text-align:center;font-size:13px;margin:16px 0 0">{s.longPress}</p>
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

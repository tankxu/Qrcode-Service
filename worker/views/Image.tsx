import type { FC } from "hono/jsx";
import { Layout } from "./Layout";
import { NoteCard } from "./NoteCard";
import { ExpiredHint } from "./ExpiredHint";
import type { Locale, Strings } from "../lib/i18n";

interface Props {
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  note?: string | null;
  expired?: boolean;
  locale: Locale;
  s: Strings;
}

export const ImageView: FC<Props> = ({ imageUrl, title, description, note, expired, locale, s }) => {
  return (
    <Layout lang={locale} title={title || "PandaQR"} description={description || undefined} ogImage={imageUrl}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:28px 24px">
            {title && <h1 class="title" style="text-align:center;margin:0 0 12px">{title}</h1>}
            {description && <p class="desc" style="text-align:center;margin:0 0 20px">{description}</p>}
            <img src={imageUrl} alt={title || ""} style="width:100%;border-radius:12px;background:#f1f5f9" />
            <p class="muted" style="text-align:center;font-size:13px;margin:20px 0 0">{s.longPress}</p>
          </div>
          <ExpiredHint expired={expired} s={s} />
          <NoteCard note={note} s={s} />
          <div class="brand-row">
            <a class="brand" href="https://pandaqr.xyz">
              <img class="brand-logo" src="/images/logo.png" alt="" />
              <span>{s.poweredBy}</span>
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

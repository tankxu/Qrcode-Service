import type { FC } from "hono/jsx";
import { Layout } from "./Layout";
import { NoteCard } from "./NoteCard";
import { ExpiredHint } from "./ExpiredHint";
import type { Locale, Strings } from "../lib/i18n";

interface Props {
  url: string;
  note?: string | null;
  expired?: boolean;
  locale: Locale;
  s: Strings;
}

export const UrlView: FC<Props> = ({ url, note, expired, locale, s }) => {
  let host = url;
  try { host = new URL(url).host; } catch {}
  // If a note is set OR content has expired, skip auto-redirect so the
  // visitor can read the fallback info / expiration warning.
  const autoRedirect = !expired && (!note || !note.trim());
  return (
    <Layout lang={locale} title={s.urlGoingTo}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:24px;text-align:center">
            <p class="desc" style="margin-bottom:8px">{s.urlGoingTo}</p>
            <h1 class="title" style="font-size:18px;word-break:break-all;margin-bottom:20px">{host}</h1>
            <a href={url} class="btn" style="width:100%">{s.urlContinue} →</a>
            {autoRedirect && <p class="muted" style="font-size:12px;margin:16px 0 0">{s.urlAuto}</p>}
          </div>
          <ExpiredHint expired={expired} s={s} />
          <NoteCard note={note} s={s} />
          <div class="brand-row">
            <a class="brand" href="https://pandaqr.xyz">
              <img class="brand-logo" src="https://pandaqr.xyz/images/logo.png" alt="" />
              <span>{s.poweredBy}</span>
            </a>
          </div>
        </div>
      </div>
      {autoRedirect && (
        <script
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){location.replace(${JSON.stringify(url)})},1500);`,
          }}
        />
      )}
    </Layout>
  );
};

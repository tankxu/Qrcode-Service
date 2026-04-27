import type { FC } from "hono/jsx";
import { Layout } from "./Layout";
import type { Locale, Strings } from "../lib/i18n";

interface Props {
  kind: "not_found" | "paused" | "deleted";
  locale: Locale;
  s: Strings;
}

export const ErrorView: FC<Props> = ({ kind, locale, s }) => {
  const titleKey =
    kind === "not_found" ? s.errNotFoundTitle : kind === "paused" ? s.errPausedTitle : s.errDeletedTitle;
  const bodyKey =
    kind === "not_found" ? s.errNotFoundBody : kind === "paused" ? s.errPausedBody : s.errDeletedBody;
  return (
    <Layout lang={locale} title={titleKey}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:32px;text-align:center">
            <div style="font-size:48px;margin-bottom:8px">📭</div>
            <h1 class="title">{titleKey}</h1>
            <p class="desc">{bodyKey}</p>
            <a href="/" class="btn btn-secondary" style="margin-top:8px">{s.visitHome}</a>
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

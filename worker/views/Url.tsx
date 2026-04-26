import type { FC } from "hono/jsx";
import { Layout } from "./Layout";

interface Props {
  url: string;
  locale: "en" | "zh-CN";
}

const t = {
  "en": {
    title: "You're heading to",
    cta: "Continue",
    auto: "Auto-redirecting in 1.5 seconds...",
    poweredBy: "Powered by QuickQR",
  },
  "zh-CN": {
    title: "即将前往",
    cta: "继续",
    auto: "1.5 秒后自动跳转……",
    poweredBy: "由 QuickQR 提供",
  },
};

export const UrlView: FC<Props> = ({ url, locale }) => {
  const tt = t[locale];
  let host = url;
  try { host = new URL(url).host; } catch {}
  return (
    <Layout title={tt.title}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:24px;text-align:center">
            <p class="desc" style="margin-bottom:8px">{tt.title}</p>
            <h1 class="title" style="font-size:18px;word-break:break-all;margin-bottom:20px">{host}</h1>
            <a href={url} class="btn" style="width:100%">{tt.cta} →</a>
            <p class="muted" style="font-size:12px;margin:16px 0 0">{tt.auto}</p>
          </div>
          <div class="brand">
            <span class="brand-logo">Q</span>
            <span>{tt.poweredBy}</span>
          </div>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `setTimeout(function(){location.replace(${JSON.stringify(url)})},1500);`,
        }}
      />
    </Layout>
  );
};

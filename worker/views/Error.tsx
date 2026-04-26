import type { FC } from "hono/jsx";
import { Layout } from "./Layout";

interface Props {
  kind: "not_found" | "paused" | "deleted";
  locale: "en" | "zh-CN";
}

const t = {
  "en": {
    not_found: { title: "QR not found", body: "This code may be invalid or no longer exists." },
    paused: { title: "Temporarily unavailable", body: "The owner has paused this QR. Check back later." },
    deleted: { title: "Content removed", body: "The owner has removed this QR." },
    poweredBy: "Powered by QuickQR",
    home: "Visit QuickQR",
  },
  "zh-CN": {
    not_found: { title: "二维码不存在", body: "可能链接无效或已被移除。" },
    paused: { title: "暂时不可用", body: "所有者暂停了此二维码,稍后再试。" },
    deleted: { title: "内容已下线", body: "所有者已移除此二维码。" },
    poweredBy: "由 QuickQR 提供",
    home: "访问 QuickQR",
  },
};

export const ErrorView: FC<Props> = ({ kind, locale }) => {
  const tt = t[locale];
  const c = tt[kind];
  return (
    <Layout title={c.title}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:32px;text-align:center">
            <div style="font-size:48px;margin-bottom:8px">📭</div>
            <h1 class="title">{c.title}</h1>
            <p class="desc">{c.body}</p>
            <a href="/" class="btn btn-secondary" style="margin-top:8px">{tt.home}</a>
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

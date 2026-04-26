import type { FC } from "hono/jsx";
import { Layout } from "./Layout";

interface Props {
  imageUrl: string;
  title?: string | null;
  description?: string | null;
  locale: "en" | "zh-CN";
}

const t = {
  "en": {
    longPress: "Long-press the image to save",
    poweredBy: "Powered by QuickQR",
  },
  "zh-CN": {
    longPress: "长按图片保存到相册,或在微信中长按识别二维码",
    poweredBy: "由 QuickQR 提供",
  },
};

export const ImageView: FC<Props> = ({ imageUrl, title, description, locale }) => {
  const tt = t[locale];
  return (
    <Layout title={title || "QuickQR"} description={description || undefined} ogImage={imageUrl}>
      <div class="center">
        <div class="frame">
          <div class="card" style="padding:20px">
            {title && <h1 class="title">{title}</h1>}
            {description && <p class="desc">{description}</p>}
            <img src={imageUrl} alt={title || "QR target"} style="width:100%;border-radius:12px;background:#f1f5f9" />
            <p class="muted" style="text-align:center;font-size:13px;margin:16px 0 0">{tt.longPress}</p>
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

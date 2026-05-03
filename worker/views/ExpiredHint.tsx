import type { FC } from "hono/jsx";
import type { Strings } from "../lib/i18n";

interface Props {
  expired?: boolean;
  s: Strings;
}

export const ExpiredHint: FC<Props> = ({ expired, s }) => {
  if (!expired) return null;
  return (
    <div
      class="card"
      style="padding:12px 16px;margin-top:12px;border:1px solid #fecaca;background:#fef2f2"
    >
      <div style="font-size:12px;color:#b91c1c;line-height:1.5">{s.mayBeExpired}</div>
    </div>
  );
};

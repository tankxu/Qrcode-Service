import type { FC } from "hono/jsx";
import type { Strings } from "../lib/i18n";

interface Props {
  note?: string | null;
  s: Strings;
}

export const NoteCard: FC<Props> = ({ note, s }) => {
  if (!note || !note.trim()) return null;
  return (
    <div
      class="card"
      style="padding:16px 20px;margin-top:12px;border:1px solid #e2e8f0;background:#fafbff"
    >
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:8px">
        {s.noteHeading}
      </div>
      <div style="font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.55;word-break:break-word">{note}</div>
    </div>
  );
};

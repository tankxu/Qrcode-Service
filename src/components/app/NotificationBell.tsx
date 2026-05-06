import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, Check, Loader2 } from "lucide-react";
import { notificationsApi, type NotificationItem } from "@/src/lib/api";

const POLL_INTERVAL_MS = 60_000;

type Placement = "top-right" | "bottom-left";

export function NotificationBell({ placement = "top-right" }: { placement?: Placement } = {}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = async (markStale = false) => {
    try {
      const { notifications, unread } = await notificationsApi.list();
      setItems(notifications);
      setUnread(unread);
      if (markStale) setLoading(false);
    } catch {
      if (markStale) setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(() => refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!items) {
      setLoading(true);
      await refresh(true);
    }
  };

  const handleMarkAll = async () => {
    if (unread === 0) return;
    setUnread(0);
    setItems((prev) => (prev ? prev.map((n) => (n.read_at ? n : { ...n, read_at: Date.now() })) : prev));
    try {
      await notificationsApi.readAll();
    } catch {
      refresh();
    }
  };

  const handleClickItem = async (n: NotificationItem) => {
    if (n.read_at) return;
    setItems((prev) => (prev ? prev.map((x) => (x.id === n.id ? { ...x, read_at: Date.now() } : x)) : prev));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await notificationsApi.read(n.id);
    } catch {
      refresh();
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("notifications.title")}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden ${
          placement === "bottom-left" ? "bottom-full mb-2 left-0" : "top-full mt-2 right-0"
        }`}>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-semibold">{t("notifications.title")}</span>
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unread === 0}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:text-slate-300 disabled:cursor-not-allowed"
            >
              {t("notifications.markAllRead")}
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading || !items ? (
              <div className="py-10 flex justify-center text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 px-6 text-center text-sm text-slate-500">{t("notifications.empty")}</div>
            ) : (
              items.map((n) => <Row key={n.id} n={n} onClick={() => handleClickItem(n)} lang={i18n.language} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ n, onClick, lang }: { n: NotificationItem; onClick: () => void; lang: string }) {
  const when = relativeTime(n.created_at, lang);
  const inner = (
    <div className={`px-4 py-3 border-b border-slate-100 last:border-0 ${n.read_at ? "bg-white" : "bg-blue-50/40"}`}>
      <div className="flex items-start gap-2">
        {!n.read_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-900 truncate">{n.title}</div>
          {n.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>}
          <div className="text-[11px] text-slate-400 mt-1">{when}</div>
        </div>
        {n.read_at && <Check className="w-3.5 h-3.5 text-slate-300 mt-0.5" />}
      </div>
    </div>
  );
  if (n.qr_id) {
    return (
      <Link to={`/qr/${n.qr_id}`} onClick={onClick} className="block hover:bg-slate-50">
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="w-full text-left hover:bg-slate-50">
      {inner}
    </button>
  );
}

function relativeTime(ms: number, lang: string): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (m < 1) return rtf.format(0, "minute");
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.floor(m / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const d = Math.floor(h / 24);
  return rtf.format(-d, "day");
}

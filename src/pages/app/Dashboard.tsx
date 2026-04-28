import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Plus, QrCode, Image as ImageIcon, Link as LinkIcon, List, Loader2 } from "lucide-react";
import { qrsApi, type Qr } from "@/src/lib/api";
import { usePageTitle } from "@/src/hooks/usePageTitle";

const typeIcon: Record<Qr["target"]["type"], React.FC<{ className?: string }>> = {
  image: ImageIcon,
  url: LinkIcon,
  multilink: List,
};

export default function Dashboard() {
  const [qrs, setQrs] = useState<Qr[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  usePageTitle("meta.dashboard");

  useEffect(() => {
    qrsApi.list()
      .then((d) => setQrs(d.qrs))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <div className="text-red-600 text-sm">{t("common.error")}: {error}</div>;
  }

  if (!qrs) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("dashboard.subtitle")}</p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {t("dashboard.newQr")}
        </Link>
      </div>

      {qrs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {qrs.map((qr) => <QrCard key={qr.id} qr={qr} />)}
        </div>
      )}
    </div>
  );
}

function QrCard({ qr }: { qr: Qr }) {
  const Icon = typeIcon[qr.target.type];
  const { t } = useTranslation();
  return (
    <Link
      to={`/qr/${qr.id}`}
      className="group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Icon className="w-5 h-5" />
        </div>
        {qr.status === "paused" && (
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            {t("dashboard.paused")}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
        {qr.title || qr.slug}
      </h3>
      <p className="text-xs text-slate-500 mt-1 truncate">/q/{qr.slug}</p>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-xs">
        <span className="text-slate-500">{t("dashboard.scans", { count: qr.scan_total })}</span>
        <span className="text-slate-400">{t("dashboard.updated", { when: useRelativeTime(qr.updated_at) })}</span>
      </div>
    </Link>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 inline-flex items-center justify-center mb-4">
        <QrCode className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-semibold mb-2">{t("dashboard.empty.title")}</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">{t("dashboard.empty.body")}</p>
      <Link
        to="/new"
        className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700"
      >
        <Plus className="w-4 h-4 mr-1.5" />
        {t("dashboard.newQr")}
      </Link>
    </div>
  );
}

function useRelativeTime(ms: number): string {
  const { t } = useTranslation();
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t("dashboard.time.justNow");
  if (m < 60) return t("dashboard.time.mAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("dashboard.time.hAgo", { n: h });
  const d = Math.floor(h / 24);
  return t("dashboard.time.dAgo", { n: d });
}

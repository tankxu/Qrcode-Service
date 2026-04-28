import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Download, ExternalLink, Loader2, Trash2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { qrsApi, type Qr, type Analytics } from "@/src/lib/api";
import { QRPreview, downloadQrPng } from "@/src/components/app/QRPreview";
import { TargetForm, type TargetValue } from "@/src/components/app/TargetForms";
import { Sparkline } from "@/src/components/app/Sparkline";
import { usePageTitle } from "@/src/hooks/usePageTitle";
import { toast } from "sonner";

export default function QrDetail() {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<Qr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  usePageTitle("meta.qrDetail", { name: qr?.title || qr?.slug || "QR" });

  const reload = async () => {
    if (!id) return;
    try {
      const { qr } = await qrsApi.get(id);
      setQr(qr);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("detail.loadFailed"));
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (error) return <div className="text-red-600 text-sm">{t("common.error")}: {error}</div>;
  if (!qr) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const url = `${window.location.origin}/q/${qr.slug}`;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("detail.back")}
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[320px_minmax(0,1fr)] gap-8">
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-center">
              <QRPreview value={url} size={240} />
            </div>
            <Button onClick={() => downloadQrPng(url, `qr-${qr.slug}.png`)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Download className="w-4 h-4 mr-1.5" />
              {t("detail.downloadPng")}
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t("detail.publicUrl")}</div>
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-xs font-mono flex-1 min-w-0 truncate text-slate-700 bg-slate-50 px-2 py-1.5 rounded">{url}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(url); toast.success(t("common.copied")); }}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label={t("common.copy")}
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700" aria-label={t("common.open")}>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t("detail.status")}</span>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                qr.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>{qr.status}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{t("detail.totalScans")}</span>
              <span className="font-bold">{qr.scan_total}</span>
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{qr.title || qr.slug}</h1>
            {qr.description && <p className="text-sm text-slate-500 mt-1">{qr.description}</p>}
          </div>

          <Tabs defaultValue="target">
            <TabsList>
              <TabsTrigger value="target">{t("detail.tabs.target")}</TabsTrigger>
              <TabsTrigger value="analytics">{t("detail.tabs.analytics")}</TabsTrigger>
              <TabsTrigger value="settings">{t("detail.tabs.settings")}</TabsTrigger>
            </TabsList>

            <TabsContent value="target" className="mt-6">
              <TargetTab qr={qr} onSaved={reload} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <AnalyticsTab qrId={qr.id} total={qr.scan_total} />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              <SettingsTab qr={qr} onChanged={reload} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function TargetTab({ qr, onSaved }: { qr: Qr; onSaved: () => void }) {
  const [target, setTarget] = useState<TargetValue>({ type: qr.target.type, payload: qr.target.payload as never });
  const [note, setNote] = useState(qr.note ?? "");
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const handleSave = async () => {
    setSaving(true);
    try {
      await qrsApi.update(qr.id, { target, note });
      toast.success(t("common.saved"));
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <TargetForm value={target} onChange={setTarget} />
      <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("note.label")}</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("note.placeholder")}
          rows={3}
          maxLength={1000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-y"
        />
        <p className="text-xs text-slate-500">{t("note.help")}</p>
      </div>
      <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {saving ? t("detail.target.saving") : t("detail.target.saveTarget")}
        </Button>
      </div>
    </div>
  );
}

function AnalyticsTab({ qrId, total }: { qrId: string; total: number }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    qrsApi.analytics(qrId, "7d")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [qrId]);

  const last7 = data ? data.daily.reduce((a, b) => a + b.count, 0) : 0;
  const lastScan = data?.last_scan_at
    ? new Date(data.last_scan_at).toLocaleString()
    : "—";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat label={t("detail.analytics.totalScans")} value={total.toString()} />
        <Stat label={t("detail.analytics.last7Days")} value={data ? last7.toString() : "—"} />
        <Stat label={t("detail.analytics.lastScan")} value={lastScan} />
      </div>

      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{t("detail.analytics.trend7d")}</div>
      {error ? (
        <div className="text-red-600 text-sm">{t("common.error")}: {error}</div>
      ) : !data ? (
        <div className="h-20 flex items-center text-slate-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("common.loading")}
        </div>
      ) : data.daily.every((d) => d.count === 0) ? (
        <div className="h-20 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 text-sm">
          {t("detail.analytics.noScans")}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-4">
          <Sparkline data={data.daily} width={640} height={120} className="w-full h-auto" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function SettingsTab({ qr, onChanged }: { qr: Qr; onChanged: () => void }) {
  const [title, setTitle] = useState(qr.title || "");
  const [description, setDescription] = useState(qr.description || "");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const save = async () => {
    setSaving(true);
    try {
      await qrsApi.update(qr.id, { title: title || "", description: description || "" });
      toast.success(t("detail.settings.saved"));
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async () => {
    try {
      await qrsApi.update(qr.id, { status: qr.status === "active" ? "paused" : "active" });
      toast.success(qr.status === "active" ? t("detail.settings.paused") : t("detail.settings.resumed"));
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.settings.saveFailed"));
    }
  };

  const remove = async () => {
    const name = qr.title || qr.slug;
    if (!confirm(t("detail.settings.danger.confirm", { name }))) return;
    try {
      await qrsApi.remove(qr.id);
      toast.success(t("common.deleted"));
      navigate("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.settings.saveFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("detail.settings.title")}</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("detail.settings.description")}</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11" />
        </div>
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={togglePause}>
            {qr.status === "active" ? (
              <><Pause className="w-4 h-4 mr-1.5" />{t("detail.settings.pause")}</>
            ) : (
              <><Play className="w-4 h-4 mr-1.5" />{t("detail.settings.resume")}</>
            )}
          </Button>
          <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("common.save")}
          </Button>
        </div>
      </div>

      <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-red-700 mb-1">{t("detail.settings.danger.title")}</h3>
        <p className="text-sm text-slate-500 mb-4">{t("detail.settings.danger.body")}</p>
        <Button variant="outline" onClick={remove} className="border-red-200 text-red-700 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-1.5" />
          {t("detail.settings.danger.delete")}
        </Button>
      </div>
    </div>
  );
}

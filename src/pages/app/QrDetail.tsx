import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Copy, Download, ExternalLink, Loader2, Trash2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { qrsApi, type Qr } from "@/src/lib/api";
import { QRPreview, downloadQrPng } from "@/src/components/app/QRPreview";
import { TargetForm, type TargetValue } from "@/src/components/app/TargetForms";
import { toast } from "sonner";

export default function QrDetail() {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<Qr | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    if (!id) return;
    try {
      const { qr } = await qrsApi.get(id);
      setQr(qr);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [id]);

  if (error) return <div className="text-red-600 text-sm">Error: {error}</div>;
  if (!qr) return <div className="flex justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const url = `${window.location.origin}/q/${qr.slug}`;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/app" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Link>

      <div className="grid lg:grid-cols-[320px_1fr] gap-8">
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-center">
              <QRPreview value={url} size={240} />
            </div>
            <Button onClick={() => downloadQrPng(url, `qr-${qr.slug}.png`)} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <Download className="w-4 h-4 mr-1.5" />
              Download PNG
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Public URL</div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono flex-1 truncate text-slate-700 bg-slate-50 px-2 py-1.5 rounded">{url}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-700">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Status</span>
              <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                qr.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>{qr.status}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Total scans</span>
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
              <TabsTrigger value="target">Target</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await qrsApi.update(qr.id, { target });
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <TargetForm value={target} onChange={setTarget} />
      <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save target
        </Button>
      </div>
    </div>
  );
}

function AnalyticsTab({ qrId, total }: { qrId: string; total: number }) {
  // Phase F will implement /api/qrs/:id/analytics; placeholder for now
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total scans" value={total.toString()} />
        <Stat label="Last 7 days" value="—" />
        <Stat label="Last scan" value="—" />
      </div>
      <p className="text-xs text-slate-400 mt-6">Sparkline & breakdown wired up in the next iteration.</p>
      <span className="sr-only">qr {qrId}</span>
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

  const save = async () => {
    setSaving(true);
    try {
      await qrsApi.update(qr.id, { title: title || "", description: description || "" });
      toast.success("Saved");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const togglePause = async () => {
    try {
      await qrsApi.update(qr.id, { status: qr.status === "active" ? "paused" : "active" });
      toast.success(qr.status === "active" ? "Paused" : "Resumed");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const remove = async () => {
    if (!confirm(`Delete "${qr.title || qr.slug}" permanently? This cannot be undone.`)) return;
    try {
      await qrsApi.remove(qr.id);
      toast.success("Deleted");
      navigate("/app");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Description</label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-11" />
        </div>
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={togglePause}>
            {qr.status === "active" ? <><Pause className="w-4 h-4 mr-1.5" />Pause</> : <><Play className="w-4 h-4 mr-1.5" />Resume</>}
          </Button>
          <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </div>
      </div>

      <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
        <h3 className="font-semibold text-red-700 mb-1">Danger zone</h3>
        <p className="text-sm text-slate-500 mb-4">Deleting permanently removes this QR, its image (if any), and all scan history.</p>
        <Button variant="outline" onClick={remove} className="border-red-200 text-red-700 hover:bg-red-50">
          <Trash2 className="w-4 h-4 mr-1.5" />
          Delete this QR
        </Button>
      </div>
    </div>
  );
}

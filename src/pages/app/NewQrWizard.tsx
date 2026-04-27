import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Link as LinkIcon, List, Check, Loader2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { qrsApi, type TargetType } from "@/src/lib/api";
import { TargetForm, emptyTarget, type TargetValue } from "@/src/components/app/TargetForms";
import { QRPreview, downloadQrPng } from "@/src/components/app/QRPreview";
import { usePageTitle } from "@/src/hooks/usePageTitle";
import { toast } from "sonner";

const typeOptions: { type: TargetType; icon: React.FC<{ className?: string }>; color: string }[] = [
  { type: "image", icon: ImageIcon, color: "bg-pink-50 text-pink-600" },
  { type: "url", icon: LinkIcon, color: "bg-emerald-50 text-emerald-600" },
  { type: "multilink", icon: List, color: "bg-indigo-50 text-indigo-600" },
];

export default function NewQrWizard() {
  const { t } = useTranslation();
  usePageTitle("meta.newQr");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [, setType] = useState<TargetType | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<TargetValue | null>(null);
  const [creating, setCreating] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const chooseType = (ty: TargetType) => {
    setType(ty);
    setTarget(emptyTarget(ty));
    setStep(2);
  };

  const validate = (): string | null => {
    if (!target) return t("wizard.validation.pickTarget");
    if (target.type === "image" && !target.payload.r2_key) return t("wizard.validation.uploadImage");
    if (target.type === "url" && !target.payload.url) return t("wizard.validation.enterUrl");
    if (target.type === "multilink") {
      if (target.payload.items.length === 0) return t("wizard.validation.atLeastOneLink");
      for (const it of target.payload.items) {
        if (!it.label || !it.url) return t("wizard.validation.fillAllLinks");
      }
    }
    return null;
  };

  const handleCreate = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setCreating(true);
    try {
      const { qr } = await qrsApi.create({
        title: title || undefined,
        note: note || undefined,
        target: target!,
      });
      setCreatedSlug(qr.slug);
      setCreatedId(qr.id);
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("wizard.validation.createFailed"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link to="/app" className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> {t("wizard.backToDashboard")}
      </Link>

      <Stepper current={step} />

      {step === 1 && (
        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          {typeOptions.map(({ type: ty, icon: Icon, color }) => (
            <button
              key={ty}
              onClick={() => chooseType(ty)}
              className="text-left p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t(`marketing.types.${ty}.title`)}</h3>
              <p className="text-sm text-slate-500">{t(`marketing.types.${ty}.body`)}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && target && (
        <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("wizard.titleLabel")}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("wizard.titlePlaceholder")} className="h-11" />
          </div>
          <div className="border-t border-slate-100 pt-6">
            <TargetForm value={target} onChange={setTarget} />
          </div>
          <div className="border-t border-slate-100 pt-6 space-y-3">
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
          <div className="flex items-center justify-between border-t border-slate-100 pt-6">
            <Button variant="outline" onClick={() => setStep(1)} disabled={creating}>
              {t("common.back")}
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700">
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {creating ? t("wizard.creating") : t("wizard.createQr")}
              {!creating && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      )}

      {step === 3 && createdSlug && createdId && (
        <SuccessStep slug={createdSlug} id={createdId} onDone={() => navigate(`/app/q/${createdId}`)} />
      )}
    </div>
  );
}

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const steps = [t("wizard.steps.type"), t("wizard.steps.configure"), t("wizard.steps.done")];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === current;
        const done = n < current;
        return (
          <div key={label} className="flex items-center">
            <div className={`flex items-center gap-2 ${active ? "text-indigo-600" : done ? "text-slate-700" : "text-slate-400"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                active ? "bg-indigo-600 text-white" : done ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="text-sm font-medium hidden sm:block">{label}</span>
            </div>
            {i < steps.length - 1 && <div className="w-8 h-px bg-slate-200 mx-2" />}
          </div>
        );
      })}
    </div>
  );
}

function SuccessStep({ slug, id, onDone }: { slug: string; id: string; onDone: () => void }) {
  const { t } = useTranslation();
  const url = `${window.location.origin}/q/${slug}`;
  return (
    <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 inline-flex items-center justify-center mb-4">
        <Check className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold mb-1">{t("wizard.success.title")}</h2>
      <p className="text-sm text-slate-500 mb-6">{t("wizard.success.body")}</p>

      <div className="inline-block p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
        <QRPreview value={url} size={256} />
      </div>
      <p className="text-xs text-slate-500 font-mono break-all mb-6">{url}</p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button onClick={() => downloadQrPng(url, `qr-${slug}.png`)} className="bg-indigo-600 hover:bg-indigo-700">
          <Download className="w-4 h-4 mr-1.5" />
          {t("wizard.success.downloadPng")}
        </Button>
        <Button variant="outline" onClick={onDone}>
          {t("wizard.success.openDetails")}
        </Button>
      </div>
      <span className="sr-only">{id}</span>
    </div>
  );
}

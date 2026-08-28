import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { QrCode, Download, Settings2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { usePageTitle } from "@/src/hooks/usePageTitle";
import { toast } from "sonner";
import { saveBlob } from "@/src/lib/saveFile";

const hexToRgbApi = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0-0-0";
  return `${parseInt(result[1], 16)}-${parseInt(result[2], 16)}-${parseInt(result[3], 16)}`;
};

type QRFormat = "png" | "jpg" | "svg";
type QREcc = "L" | "M" | "Q" | "H";

const MIME: Record<QRFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  svg: "image/svg+xml",
};

interface QRSettings {
  data: string;
  size: number;
  format: QRFormat;
  color: string;
  bgcolor: string;
  qzone: number;
  ecc: QREcc;
}

export default function StaticQrTool() {
  const { t } = useTranslation();
  usePageTitle("meta.staticQr");
  const [searchParams] = useSearchParams();
  const initialData = searchParams.get("data") || "https://pandaqr.xyz";
  const [settings, setSettings] = useState<QRSettings>({
    data: initialData,
    size: 300,
    format: "png",
    color: "#0f172a",
    bgcolor: "#ffffff",
    qzone: 1,
    ecc: "M",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [lastGeneratedUrl, setLastGeneratedUrl] = useState("");

  const generateUrl = useCallback(() => {
    const baseUrl = "https://api.qrserver.com/v1/create-qr-code/";
    const params = new URLSearchParams({
      data: settings.data || " ",
      size: `${settings.size}x${settings.size}`,
      format: settings.format,
      color: hexToRgbApi(settings.color),
      bgcolor: hexToRgbApi(settings.bgcolor),
      margin: settings.qzone.toString(),
      ecc: settings.ecc,
    });
    return `${baseUrl}?${params.toString()}`;
  }, [settings]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLastGeneratedUrl(generateUrl());
    }, 200);
    return () => clearTimeout(timeout);
  }, [generateUrl]);

  const handleDownload = async (formatOverride?: QRFormat) => {
    const fmt = formatOverride || settings.format;
    try {
      setIsLoading(true);
      const url = generateUrl().replace(`format=${settings.format}`, `format=${fmt}`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`QR service responded ${response.status}`);
      const raw = await response.blob();
      // The API does not always label the payload, and saveBlob picks the
      // share-sheet vs download path from the MIME type.
      const blob = raw.type.startsWith("image/") ? raw : new Blob([raw], { type: MIME[fmt] });
      const outcome = await saveBlob(blob, `qrcode-${Date.now()}.${fmt}`);
      if (outcome === "opened") toast.success(t("common.openedForSave"));
      else if (outcome === "shared") toast.success(t("common.saved"));
      else toast.success(t("staticQr.downloaded", { format: fmt.toUpperCase() }));
    } catch (error) {
      console.error(error);
      toast.error(t("staticQr.failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const fmtDesc: Record<QRFormat, string> = {
    png: t("staticQr.fmtPng"),
    svg: t("staticQr.fmtSvg"),
    jpg: t("staticQr.fmtJpg"),
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-135 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-fit">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-600" />
            {t("staticQr.configure")}
          </h2>
          <p className="text-sm text-slate-500">{t("staticQr.subtitle")}</p>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("staticQr.targetContent")}</label>
            <Input
              placeholder={t("staticQr.targetPlaceholder")}
              value={settings.data}
              onChange={(e) => setSettings({ ...settings, data: e.target.value })}
              className="h-12 border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
            />
          </div>

          <Separator className="bg-slate-100" />

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("staticQr.resolution")}</label>
              <Select value={settings.size.toString()} onValueChange={(val) => setSettings({ ...settings, size: parseInt(val) })}>
                <SelectTrigger className="border-slate-200 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="200">200x200</SelectItem>
                  <SelectItem value="300">300x300</SelectItem>
                  <SelectItem value="500">500x500</SelectItem>
                  <SelectItem value="1000">1000x1000</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("staticQr.ecc")}</label>
              <Select value={settings.ecc} onValueChange={(val: QREcc) => setSettings({ ...settings, ecc: val })}>
                <SelectTrigger className="border-slate-200 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">{t("staticQr.eccL")}</SelectItem>
                  <SelectItem value="M">{t("staticQr.eccM")}</SelectItem>
                  <SelectItem value="Q">{t("staticQr.eccQ")}</SelectItem>
                  <SelectItem value="H">{t("staticQr.eccH")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("staticQr.foreground")}</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: settings.color }} />
                  <Input type="color" value={settings.color} onChange={(e) => setSettings({ ...settings, color: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <span className="text-xs font-mono text-slate-500 uppercase">{settings.color}</span>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{t("staticQr.background")}</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: settings.bgcolor }} />
                  <Input type="color" value={settings.bgcolor} onChange={(e) => setSettings({ ...settings, bgcolor: e.target.value })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <span className="text-xs font-mono text-slate-500 uppercase">{settings.bgcolor}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>{t("staticQr.quietZone")}</span>
              <span>{settings.qzone}px</span>
            </div>
            <Slider
              value={[settings.qzone]}
              onValueChange={(val) => setSettings({ ...settings, qzone: Array.isArray(val) ? val[0] : val })}
              min={0}
              max={8}
              step={1}
              className="py-2"
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-xl">
          <Button className="w-full bg-blue-600 text-white py-6 rounded-lg font-semibold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-base h-11" onClick={() => handleDownload()} disabled={isLoading}>
            {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-5 h-5" />}
            {t("staticQr.generateDownload")}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <Card className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center relative p-12 min-h-115">
          <div className="relative p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner max-w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={lastGeneratedUrl}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="w-64 h-64 max-w-full bg-white p-4 rounded-xl shadow-md flex items-center justify-center"
              >
                {lastGeneratedUrl ? (
                  <img src={lastGeneratedUrl} alt="QR Code" className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
                ) : (
                  <div className="flex flex-col items-center gap-4 text-slate-300">
                    <QrCode className="w-16 h-16" />
                    <p className="text-xs font-medium">…</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

        </Card>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
            <Download className="w-4 h-4 text-blue-600" />
            {t("staticQr.exportOptions")}
          </h3>
          <div className="flex gap-3">
            {(["png", "svg", "jpg"] as const).map((fmt) => (
              <button key={fmt} onClick={() => handleDownload(fmt)} className="flex-1 flex flex-col items-center justify-center py-4 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50/50 group transition-all">
                <span className="text-lg font-bold group-hover:text-blue-600 uppercase tracking-tight">{fmt}</span>
                <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5 text-center px-1">
                  {fmtDesc[fmt]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

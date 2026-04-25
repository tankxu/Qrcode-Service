/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  QrCode, 
  Download, 
  Settings2, 
  Type, 
  Palette, 
  Maximize, 
  RefreshCcw,
  ExternalLink,
  Github
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// --- Utilities ---

const hexToRgbApi = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0-0-0";
  return `${parseInt(result[1], 16)}-${parseInt(result[2], 16)}-${parseInt(result[3], 16)}`;
};

type QRFormat = "png" | "jpg" | "svg";
type QREcc = "L" | "M" | "Q" | "H";

interface QRSettings {
  data: string;
  size: number;
  format: QRFormat;
  color: string;
  bgcolor: string;
  qzone: number;
  ecc: QREcc;
}

export default function App() {
  const [settings, setSettings] = useState<QRSettings>({
    data: "https://github.com/shadcn-ui/ui",
    size: 300,
    format: "png",
    color: "#0f172a", // Slate 900
    bgcolor: "#ffffff",
    qzone: 1,
    ecc: "M"
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
      ecc: settings.ecc
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
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `qrcode-${Date.now()}.${fmt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded as ${fmt.toUpperCase()}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to download.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyUrl = () => {
    const url = generateUrl();
    navigator.clipboard.writeText(url);
    toast.success("API URL copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Toaster position="top-center" richColors />
      
      {/* Header */}
      <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-slate-800">QuickQR Studio</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium text-slate-500">
          <span className="text-indigo-600 border-b-2 border-indigo-600 h-16 flex items-center">Generator</span>
          <a href="#" className="hover:text-indigo-600 transition-colors">History</a>
          <a href="https://goqr.me/api/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors">
            API Documentation <ExternalLink className="w-3 h-3" />
          </a>
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200"></div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-10 flex flex-col lg:flex-row gap-8">
        {/* Left Side: Configuration */}
        <div className="w-full lg:w-[540px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-fit">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-600" />
              Configure QR Code
            </h2>
            <p className="text-sm text-slate-500">Input content and customize visual parameters.</p>
          </div>

          <div className="p-6 space-y-8">
            {/* Content Input */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Content</label>
              <Input 
                id="qr-data"
                placeholder="https://example.com/your-destination"
                value={settings.data}
                onChange={(e) => setSettings({ ...settings, data: e.target.value })}
                className="h-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10"
              />
            </div>

            <Separator className="bg-slate-100" />

            {/* Customization Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resolution (px)</label>
                <Select 
                  value={settings.size.toString()} 
                  onValueChange={(val) => setSettings({ ...settings, size: parseInt(val) })}
                >
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
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Correction Level</label>
                <Select 
                  value={settings.ecc} 
                  onValueChange={(val: QREcc) => setSettings({ ...settings, ecc: val })}
                >
                  <SelectTrigger className="border-slate-200 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">L (Low - 7%)</SelectItem>
                    <SelectItem value="M">M (Mid - 15%)</SelectItem>
                    <SelectItem value="Q">Q (Quartile - 25%)</SelectItem>
                    <SelectItem value="H">H (High - 30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Foreground</label>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div 
                      className="w-11 h-11 rounded-lg border border-slate-200 shadow-sm" 
                      style={{ backgroundColor: settings.color }}
                    />
                    <Input 
                      type="color" 
                      value={settings.color}
                      onChange={(e) => setSettings({ ...settings, color: e.target.value })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 uppercase">{settings.color}</span>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Background</label>
                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <div 
                      className="w-11 h-11 rounded-lg border border-slate-200 shadow-sm" 
                      style={{ backgroundColor: settings.bgcolor }}
                    />
                    <Input 
                      type="color" 
                      value={settings.bgcolor}
                      onChange={(e) => setSettings({ ...settings, bgcolor: e.target.value })}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-500 uppercase">{settings.bgcolor}</span>
                </div>
              </div>
            </div>

             <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>Quiet Zone Margin</span>
                <span>{settings.qzone}px</span>
              </div>
              <Slider 
                value={[settings.qzone]} 
                onValueChange={(val) => {
                  const newValue = Array.isArray(val) ? val[0] : val;
                  setSettings({ ...settings, qzone: newValue });
                }}
                min={0}
                max={8}
                step={1}
                className="py-2"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 rounded-b-xl">
            <Button 
              className="w-full bg-indigo-600 text-white py-6 rounded-lg font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-base h-11"
              onClick={() => handleDownload()}
              disabled={isLoading}
            >
              {isLoading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-5 h-5" />}
              Generate & Download
            </Button>
          </div>
        </div>

        {/* Right Side: Preview & Export */}
        <div className="flex-1 flex flex-col gap-8">
          <Card className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col items-center justify-center relative p-12 min-h-[460px]">
             <div className="absolute top-6 right-6 bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-1.5 tracking-wider">
               <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
               READY TO DOWNLOAD
            </div>

            <div className="relative group p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
              <AnimatePresence mode="wait">
                <motion.div
                  key={lastGeneratedUrl}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="w-64 h-64 bg-white p-4 rounded-xl shadow-md flex items-center justify-center"
                >
                  {lastGeneratedUrl ? (
                    <img 
                      src={lastGeneratedUrl} 
                      alt="QR Code" 
                      className="w-full h-full object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <QrCode className="w-16 h-16" />
                      <p className="text-xs font-medium">Processing...</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="mt-8 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-slate-400">Preview Scale: 100%</p>
              <Button variant="ghost" size="sm" onClick={handleCopyUrl} className="text-indigo-600 text-xs hover:bg-slate-50">
                Copy direct API link
              </Button>
            </div>
          </Card>

          {/* Export Options Card */}
          <div className="h-44 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <Download className="w-4 h-4 text-indigo-600" />
              Export Options
            </h3>
            <div className="flex gap-4">
              {(["png", "svg", "jpg"] as const).map((fmt) => (
                <button 
                  key={fmt}
                  onClick={() => handleDownload(fmt)}
                  className="flex-1 flex flex-col items-center justify-center py-4 border border-slate-200 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/50 group transition-all"
                >
                  <span className="text-lg font-bold group-hover:text-indigo-600 uppercase tracking-tight">{fmt}</span>
                  <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
                    {fmt === "svg" ? "Vector Path" : fmt === "jpg" ? "Web Compressed" : "Raster Image"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="h-12 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-8 text-[11px] text-slate-500 font-medium tracking-wide">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm" /> 
            API Status: Online
          </span>
          <span className="text-slate-300">|</span>
          <span>Latency: 42ms</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Powered by goqr.me</span>
          <span className="text-slate-300">•</span>
          <span>System Version 2.4.0</span>
        </div>
      </footer>
    </div>
  );
}

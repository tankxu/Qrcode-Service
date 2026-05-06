import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  value: string;
  size?: number;
  margin?: number;
  className?: string;
}

export function QRPreview({ value, size = 256, margin = 2, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, value, {
      width: size,
      margin,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).catch((e) => setError(String(e)));
  }, [value, size, margin]);

  if (error) return <div className="text-xs text-red-600">{error}</div>;
  return (
    <canvas
      ref={ref}
      className={className}
      aria-label="QR preview"
      style={{ maxWidth: "100%", height: "auto" }}
    />
  );
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadQrPng(value: string, filename: string, size = 1024) {
  const dataUrl = await QRCode.toDataURL(value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  triggerDownload(dataUrl, filename);
}

export async function downloadQrJpg(value: string, filename: string, size = 1024) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, value, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  triggerDownload(dataUrl, filename);
}

export async function downloadQrSvg(value: string, filename: string) {
  const svg = await QRCode.toString(value, {
    type: "svg",
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

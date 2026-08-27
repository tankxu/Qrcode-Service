import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { canvasToBlob, saveBlob } from "@/src/lib/saveFile";

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

const QR_OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#0f172a", light: "#ffffff" },
};

async function renderQrCanvas(value: string, size: number) {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, value, { ...QR_OPTIONS, width: size });
  return canvas;
}

export async function downloadQrPng(value: string, filename: string, size = 1024) {
  const canvas = await renderQrCanvas(value, size);
  return saveBlob(await canvasToBlob(canvas, "image/png"), filename);
}

export async function downloadQrJpg(value: string, filename: string, size = 1024) {
  const canvas = await renderQrCanvas(value, size);
  return saveBlob(await canvasToBlob(canvas, "image/jpeg", 0.92), filename);
}

export async function downloadQrSvg(value: string, filename: string) {
  const svg = await QRCode.toString(value, { ...QR_OPTIONS, type: "svg" });
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  return saveBlob(blob, filename);
}

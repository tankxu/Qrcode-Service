import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import { SUPPORTED_LOCALES } from "@/src/i18n";

interface Props {
  align?: "left" | "right";
  variant?: "header" | "inline";
}

export function LanguageSwitcher({ align = "right", variant = "header" }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = (i18n.resolvedLanguage || i18n.language || "").toLowerCase();
  const current =
    SUPPORTED_LOCALES.find((l) => l.code.toLowerCase() === active) ||
    SUPPORTED_LOCALES.find((l) => active.startsWith(l.code.toLowerCase().split("-")[0])) ||
    SUPPORTED_LOCALES[0];

  const change = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("common.language")}
        className={
          variant === "header"
            ? "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            : "inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
        }
      >
        <Globe className="w-4 h-4" />
        <span>{current.label}</span>
      </button>
      {open && (
        <div
          className={`absolute mt-2 ${align === "right" ? "right-0" : "left-0"} bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-40 z-50`}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => change(l.code)}
              className="w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50"
            >
              <span>{l.label}</span>
              {l.code === current.code && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

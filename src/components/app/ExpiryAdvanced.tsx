import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ExpiryConfig, ExpiryInput } from "@/src/lib/api";

const DAY = 86400;

const LEAD_OPTIONS: { seconds: number; key: "24h" | "3d" | "7d" }[] = [
  { seconds: DAY, key: "24h" },
  { seconds: 3 * DAY, key: "3d" },
  { seconds: 7 * DAY, key: "7d" },
];

type Preset = "7d" | "30d" | "custom";

export interface ExpiryFormValue {
  enabled: boolean;
  preset: Preset;
  windowDays: number;       // for custom; otherwise mirrors preset
  leadSeconds: number[];
  action: "keep" | "pause";
}

export function defaultExpiryForm(): ExpiryFormValue {
  return { enabled: false, preset: "7d", windowDays: 7, leadSeconds: [DAY], action: "keep" };
}

export function expiryFormFromConfig(cfg: ExpiryConfig): ExpiryFormValue {
  if (!cfg.enabled) return defaultExpiryForm();
  const days = Math.round(cfg.window_seconds / DAY);
  const preset: Preset = days === 7 ? "7d" : days === 30 ? "30d" : "custom";
  return {
    enabled: true,
    preset,
    windowDays: days,
    leadSeconds: cfg.lead_times,
    action: cfg.action,
  };
}

export function expiryFormToInput(v: ExpiryFormValue): ExpiryInput {
  if (!v.enabled) return { enabled: false };
  const windowSeconds = Math.max(1, Math.round(v.windowDays * DAY));
  const leadSeconds = v.leadSeconds.filter((s) => s > 0 && s < windowSeconds);
  return {
    enabled: true,
    window_seconds: windowSeconds,
    lead_times: leadSeconds,
    action: v.action,
  };
}

// Suggests enabling the 7-day default for WeChat-group-style content.
export function suggestExpiryFor(title: string, note: string, type: "image" | "url" | "multilink"): boolean {
  if (type !== "image") return false;
  const haystack = `${title} ${note}`.toLowerCase();
  return /(微信|wechat|群码|群二维码|入群|加群|\bgroup\b|\binvite\b)/.test(haystack);
}

interface Props {
  value: ExpiryFormValue;
  onChange: (v: ExpiryFormValue) => void;
}

export function ExpiryAdvanced({ value, onChange }: Props) {
  const { t } = useTranslation();
  const windowSeconds = Math.max(1, Math.round(value.windowDays * DAY));

  const setPreset = (preset: Preset) => {
    if (preset === "7d") onChange({ ...value, preset, windowDays: 7 });
    else if (preset === "30d") onChange({ ...value, preset, windowDays: 30 });
    else onChange({ ...value, preset, windowDays: Math.max(1, value.windowDays || 14) });
  };

  const toggleLead = (seconds: number) => {
    const has = value.leadSeconds.includes(seconds);
    const next = has ? value.leadSeconds.filter((s) => s !== seconds) : [...value.leadSeconds, seconds];
    onChange({ ...value, leadSeconds: next.sort((a, b) => a - b) });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/40">
      <label className="flex items-start gap-3 p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            {t("expiry.toggle.label")}
          </span>
          <span className="block text-xs text-slate-500 mt-0.5">{t("expiry.toggle.help")}</span>
        </span>
      </label>

      {value.enabled && (
        <div className="border-t border-slate-200 p-4 space-y-5 bg-white rounded-b-xl">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("expiry.window.label")}</label>
            <div className="space-y-1.5">
              <PresetRow
                checked={value.preset === "7d"}
                onSelect={() => setPreset("7d")}
                title={t("expiry.window.wechat7.title")}
                hint={t("expiry.window.wechat7.hint")}
              />
              <PresetRow
                checked={value.preset === "30d"}
                onSelect={() => setPreset("30d")}
                title={t("expiry.window.d30.title")}
                hint={t("expiry.window.d30.hint")}
              />
              <PresetRow
                checked={value.preset === "custom"}
                onSelect={() => setPreset("custom")}
                title={t("expiry.window.custom.title")}
                trailing={
                  value.preset === "custom" ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={value.windowDays || ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          onChange({ ...value, windowDays: isNaN(n) ? 1 : Math.max(1, Math.min(365, n)) });
                        }}
                        className="h-8 w-20 text-sm"
                      />
                      <span className="text-xs text-slate-500">{t("expiry.window.custom.daysUnit")}</span>
                    </div>
                  ) : null
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("expiry.leads.label")}</label>
            <div className="flex flex-wrap gap-2">
              {LEAD_OPTIONS.filter((o) => o.seconds < windowSeconds).map((o) => {
                const active = value.leadSeconds.includes(o.seconds);
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => toggleLead(o.seconds)}
                    className={
                      active
                        ? "h-8 px-3 rounded-full text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700"
                        : "h-8 px-3 rounded-full text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }
                  >
                    {t(`expiry.leads.${o.key}`)}
                  </button>
                );
              })}
            </div>
            {value.leadSeconds.length === 0 && (
              <p className="text-xs text-amber-600">{t("expiry.leads.empty")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{t("expiry.action.label")}</label>
            <div className="space-y-1.5">
              <PresetRow
                checked={value.action === "keep"}
                onSelect={() => onChange({ ...value, action: "keep" })}
                title={t("expiry.action.keep.title")}
                hint={t("expiry.action.keep.hint")}
              />
              <PresetRow
                checked={value.action === "pause"}
                onSelect={() => onChange({ ...value, action: "pause" })}
                title={t("expiry.action.pause.title")}
                hint={t("expiry.action.pause.hint")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PresetRow({
  checked,
  onSelect,
  title,
  hint,
  trailing,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  hint?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label
      className={
        checked
          ? "flex items-start gap-3 px-3 py-2.5 rounded-lg border border-blue-200 bg-blue-50/40 cursor-pointer"
          : "flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-slate-300"
      }
    >
      <input
        type="radio"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
      {trailing}
    </label>
  );
}

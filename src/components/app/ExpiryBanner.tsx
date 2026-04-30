import { useTranslation } from "react-i18next";
import { AlertTriangle, Clock } from "lucide-react";
import type { ExpiryConfig } from "@/src/lib/api";
import { expiryStatus } from "@/src/lib/expiry";

interface Props {
  expiry: ExpiryConfig;
}

export function ExpiryBanner({ expiry }: Props) {
  const { t, i18n } = useTranslation();
  const status = expiryStatus(expiry);
  if (status.kind === "off" || status.kind === "ok") return null;

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const expiresLabel = formatter.format(new Date(status.expiresAt));

  if (status.kind === "expired") {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-sm">
          <div className="font-semibold text-red-700">{t("expiry.banner.expiredTitle")}</div>
          <div className="text-red-700/90 mt-0.5">{t("expiry.banner.expiredBody", { when: expiresLabel })}</div>
        </div>
      </div>
    );
  }

  const palette =
    status.kind === "imminent"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-amber-200 bg-amber-50 text-amber-800";
  const icon =
    status.kind === "imminent" ? (
      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
    ) : (
      <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
    );

  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 ${palette}`}>
      {icon}
      <div className="flex-1 min-w-0 text-sm">
        <div className="font-semibold">{t("expiry.banner.dueTitle", { count: status.hoursLeft })}</div>
        <div className="opacity-90 mt-0.5">{t("expiry.banner.dueBody", { when: expiresLabel })}</div>
      </div>
    </div>
  );
}

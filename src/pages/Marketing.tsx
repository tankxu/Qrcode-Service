import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, Image as ImageIcon, Link as LinkIcon, List, RefreshCcw, Globe, Zap } from "lucide-react";

const ctaClass =
  "inline-flex items-center justify-center h-12 px-6 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors";

export default function Marketing() {
  const { t } = useTranslation();
  const scenarios = [
    { key: "groups", emoji: "💬" },
    { key: "menu", emoji: "🍜" },
    { key: "events", emoji: "🎟️" },
  ] as const;
  const types = [
    { key: "image", icon: ImageIcon, color: "text-pink-600 bg-pink-50" },
    { key: "url", icon: LinkIcon, color: "text-emerald-600 bg-emerald-50" },
    { key: "multilink", icon: List, color: "text-indigo-600 bg-indigo-50" },
  ] as const;
  const features = [
    { key: "realtime", icon: RefreshCcw },
    { key: "global", icon: Globe },
    { key: "mobile", icon: Zap },
  ] as const;

  return (
    <>
      <section className="px-6 sm:px-8 py-16 sm:py-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          {t("marketing.badge")}
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900">
          {t("marketing.heroTitle1")} <span className="text-indigo-600">{t("marketing.heroTitle2")}</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          {t("marketing.heroSubtitle")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login" className={ctaClass}>
            {t("marketing.heroCta")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      <section className="px-6 sm:px-8 py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">{t("marketing.scenariosTitle")}</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {scenarios.map(({ key, emoji }) => (
              <div key={key} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-3xl mb-3">{emoji}</div>
                <h3 className="font-semibold mb-2">{t(`marketing.scenarios.${key}.title`)}</h3>
                <p className="text-sm text-slate-600">{t(`marketing.scenarios.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">{t("marketing.typesTitle")}</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {types.map(({ key, icon: Icon, color }) => (
            <div key={key} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t(`marketing.types.${key}.title`)}</h3>
              <p className="text-sm text-slate-600">{t(`marketing.types.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-8 py-16 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
          {features.map(({ key, icon: Icon }) => (
            <div key={key}>
              <Icon className="w-7 h-7 text-indigo-400 mb-3" />
              <h3 className="font-semibold mb-2">{t(`marketing.features.${key}.title`)}</h3>
              <p className="text-sm text-slate-400">{t(`marketing.features.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-8 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("marketing.finalCtaTitle")}</h2>
        <p className="text-slate-600 mb-8">{t("marketing.finalCtaBody")}</p>
        <Link to="/login" className={ctaClass}>
          {t("marketing.finalCta")} <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </section>
    </>
  );
}

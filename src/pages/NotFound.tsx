import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/src/hooks/usePageTitle";

export default function NotFound() {
  const { t } = useTranslation();
  usePageTitle("meta.notFound");
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <Link to="/" className="absolute top-5 left-5 flex items-center gap-2.5">
        <img src="/images/logo.png" alt="" className="w-9 h-9 rounded-lg" />
        <span className="font-bold text-lg tracking-tight">{t("brand")}</span>
      </Link>
      <img src="/images/404.png" alt="404" className="w-80 h-80 sm:w-[28rem] sm:h-[28rem] lg:w-[32rem] lg:h-[32rem] select-none" draggable={false} />
      <h1 className="mt-2 text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="mt-2 text-slate-500">{t("notFound.body")}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center justify-center h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
}

import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/src/hooks/usePageTitle";

export default function NotFound() {
  const { t } = useTranslation();
  usePageTitle("meta.notFound");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-center px-4">
      <div className="text-7xl font-bold text-slate-200">404</div>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound.title")}</h1>
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

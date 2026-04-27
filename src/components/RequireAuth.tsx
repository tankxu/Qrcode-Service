import { Navigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/src/hooks/useAuth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">{t("auth.loading")}</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

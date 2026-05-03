import { Navigate } from "react-router";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/src/hooks/useAuth";
import { LanguageSwitcher } from "@/src/components/LanguageSwitcher";
import { usePageTitle } from "@/src/hooks/usePageTitle";

export default function Login() {
  const { user, loading, login } = useAuth();
  const { t } = useTranslation();
  usePageTitle("meta.login");
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex justify-end px-6 py-4">
        <LanguageSwitcher />
      </div>
      <div className="flex-1 flex items-center justify-center px-4 -mt-16">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <a href="https://pandaqr.xyz" className="flex items-center gap-3 justify-center mb-8">
            <img src="/images/logo.png" alt="" className="w-10 h-10 rounded-lg" />
            <span className="font-bold text-xl tracking-tight">{t("brand")}</span>
          </a>
          <h1 className="text-2xl font-bold text-center mb-2">{t("login.title")}</h1>
          <p className="text-sm text-slate-500 text-center mb-8">{t("login.subtitle")}</p>
          <Button
            onClick={login}
            className="w-full h-11 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            variant="outline"
          >
            <GoogleIcon />
            <span className="ml-2">{t("login.googleButton")}</span>
          </Button>
          <p className="mt-8 text-xs text-slate-400 text-center">
            <Trans
              i18nKey="login.terms"
              components={[
                <a key="t" href="https://pandaqr.xyz/terms" className="underline" />,
                <a key="p" href="https://pandaqr.xyz/privacy" className="underline" />,
              ]}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

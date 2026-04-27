import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { QrCode, LayoutDashboard, Wrench, User, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/src/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/src/components/LanguageSwitcher";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: "/app", label: t("nav.dashboard"), icon: LayoutDashboard, end: true },
    { to: "/app/tools/static-qr", label: t("nav.staticQr"), icon: Wrench },
    { to: "/app/account", label: t("nav.account"), icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      <aside className="hidden lg:flex w-60 flex-col border-r border-slate-200 bg-white">
        <Link to="/app" className="flex items-center gap-3 h-16 px-6 border-b border-slate-100">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">{t("brand")}</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-100 space-y-2">
          <LanguageSwitcher align="left" />
          <div className="flex items-center gap-3">
            {user?.picture ? (
              <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-slate-200" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{user?.name || user?.email}</div>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-600" title={t("nav.signOut")}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMobileOpen(false)}>
          <aside className="w-64 h-full bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
              <span className="font-bold text-lg">{t("brand")}</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100 space-y-2">
              <LanguageSwitcher align="left" />
              <Button variant="ghost" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="w-4 h-4 mr-2" />
                {t("nav.signOut")}
              </Button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <button onClick={() => setMobileOpen(true)} className="text-slate-700">
            <Menu className="w-6 h-6" />
          </button>
          <Link to="/app" className="font-bold text-lg">{t("brand")}</Link>
          <div className="w-6" />
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

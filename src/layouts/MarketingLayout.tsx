import { Link, Outlet } from "react-router";
import { QrCode } from "lucide-react";
import { useAuth } from "@/src/hooks/useAuth";

export default function MarketingLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sm:px-8 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">QuickQR</span>
        </Link>
        <Link
          to={user ? "/app" : "/login"}
          className="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {user ? "Go to dashboard" : "Sign in"}
        </Link>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center px-8 text-[11px] text-slate-500 font-medium tracking-wide">
        <span>© {new Date().getFullYear()} QuickQR. One QR. Forever yours.</span>
      </footer>
    </div>
  );
}

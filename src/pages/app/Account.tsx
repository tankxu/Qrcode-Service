import { useAuth } from "@/src/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Account</h1>
      <p className="text-sm text-slate-500 mb-8">Your profile information from Google.</p>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {user?.picture ? (
            <img src={user.picture} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-full border border-slate-200" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 text-xl font-bold flex items-center justify-center">
              {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-semibold text-lg">{user?.name || "—"}</div>
            <div className="text-sm text-slate-500">{user?.email}</div>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-6 pt-6 flex">
          <Button
            variant="outline"
            onClick={async () => { await logout(); navigate("/"); }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

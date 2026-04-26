import { Link } from "react-router";
import { ArrowRight, Image as ImageIcon, Link as LinkIcon, List, RefreshCcw, Globe, Zap } from "lucide-react";

const ctaClass =
  "inline-flex items-center justify-center h-12 px-6 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors";

export default function Marketing() {
  return (
    <>
      <section className="px-6 sm:px-8 py-16 sm:py-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          Permanent QR · Forever editable
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-900">
          One QR. <span className="text-indigo-600">Forever yours.</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          Print once. Update the destination anytime — your group invite, link, or page never goes stale, and your printed QR never has to change.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login" className={ctaClass}>
            Create your QR free
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </section>

      <section className="px-6 sm:px-8 py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Built for things that change</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { title: "WeChat / Telegram group invites", body: "WeChat group QR expires after 7 days. Telegram invites get rotated. Solve it once.", emoji: "💬" },
              { title: "Restaurant menus & pricing", body: "Stick a QR on every table. Update the menu PDF, no reprint.", emoji: "🍜" },
              { title: "Event flyers & posters", body: "Same flyer, different campaigns. Switch the landing link any time.", emoji: "🎟️" },
            ].map((c) => (
              <div key={c.title} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-3xl mb-3">{c.emoji}</div>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 sm:px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Three ways to use one QR</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { icon: ImageIcon, title: "Image", body: "Upload a screenshot of your group QR or any image. Replace anytime.", color: "text-pink-600 bg-pink-50" },
            { icon: LinkIcon, title: "URL", body: "Redirect to any website. Change the destination without reprinting.", color: "text-emerald-600 bg-emerald-50" },
            { icon: List, title: "Multilink", body: "A simple link-in-bio page. List all your destinations in one place.", color: "text-indigo-600 bg-indigo-50" },
          ].map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-8 py-16 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
          {[
            { icon: RefreshCcw, title: "Real-time updates", body: "Edit the destination, the next scan sees it within 60 seconds." },
            { icon: Globe, title: "Global edge", body: "Served from 300+ Cloudflare locations. Fast scans everywhere." },
            { icon: Zap, title: "Mobile-first", body: "Scan-to-content in under 1.5 seconds on any phone." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="w-7 h-7 text-indigo-400 mb-3" />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 sm:px-8 py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Stop reprinting. Start editing.</h2>
        <p className="text-slate-600 mb-8">Sign in with Google, create your first permanent QR in minutes.</p>
        <Link to="/login" className={ctaClass}>
          Get started <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </section>
    </>
  );
}

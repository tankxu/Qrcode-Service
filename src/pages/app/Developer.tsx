import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, qrsApi, type Qr } from "@/src/lib/api";
import { Button } from "@/components/ui/button";

type Token = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  qr_id: string | null;
  expires_at: number;
  revoked_at: number | null;
  last_used_at: number | null;
};
type Event = {
  id: string;
  method: string;
  path: string;
  status: number;
  created_at: number;
};
const scopes = ["qrs:read", "qrs:write", "images:write", "qrs:delete"];
export default function Developer() {
  const { i18n } = useTranslation();
  const zh = i18n.language.startsWith("zh");
  const tr = (a: string, b: string) => (zh ? a : b);
  const [tokens, setTokens] = useState<Token[]>([]),
    [qrs, setQrs] = useState<Qr[]>([]),
    [events, setEvents] = useState<Event[]>([]);
  const [name, setName] = useState(""),
    [days, setDays] = useState(90),
    [qrId, setQrId] = useState("");
  const [selected, setSelected] = useState([
    "qrs:read",
    "qrs:write",
    "images:write",
  ]);
  const [secret, setSecret] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [copied, setCopied] = useState(false);
  const load = async () => {
    const [t, q, e] = await Promise.all([
      api<{ tokens: Token[] }>("/api/tokens"),
      qrsApi.list(),
      api<{ events: Event[] }>("/api/tokens/events"),
    ]);
    setTokens(t.tokens);
    setQrs(q.qrs);
    setEvents(e.events);
  };
  useEffect(() => {
    document.title = "Developer · PandaQR";
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const date = (n: number) => new Date(n).toLocaleString();
  const inputClass =
    "w-full border border-slate-200 rounded-lg p-2.5 bg-white text-sm";
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tr("开发者", "Developer")}</h1>
        <p className="mt-2 text-slate-500">
          {tr(
            "用 API、Agent 和快捷指令更新活码，扫码地址始终不变。",
            "Update dynamic QRs with APIs, agents and Shortcuts. Keep the same scan URL.",
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm text-blue-700 underline">
        <a
          href="https://pandaqr.xyz/docs/api/"
          target="_blank"
          rel="noreferrer"
        >
          {tr("API 文档", "API documentation")}
        </a>
        <a href="/openapi.json">OpenAPI 3.1</a>
        <a href="/skills/pandaqr.zip">Agent skill</a>
        <a href="/shortcuts/PandaQR-Update-Image.shortcut">
          {tr("下载 iOS 快捷指令", "Download iOS Shortcut")}
        </a>
      </div>
      {error && (
        <div
          role="alert"
          className="p-4 bg-red-50 text-red-700 rounded-lg break-words"
        >
          {error}
        </div>
      )}
      {secret && (
        <section className="p-5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <h2 className="font-semibold">
            {tr(
              "Token 仅显示一次，请现在保存",
              "Save your token — shown only once",
            )}
          </h2>
          <p className="text-sm">
            {tr(
              "不会再次显示完整 Token。不要放在公开代码、截图或共享的快捷指令中。",
              "Keep this token out of public code, screenshots and shared shortcuts.",
            )}
          </p>
          <code className="block break-all bg-white p-3 rounded text-sm">
            {secret}
          </code>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret);
                  setCopied(true);
                } catch {
                  setError(
                    tr(
                      "无法复制，请手动保存。",
                      "Copy failed. Please save manually.",
                    ),
                  );
                }
              }}
            >
              {copied ? tr("已复制", "Copied") : tr("复制", "Copy")}
            </Button>
            <Button variant="outline" onClick={() => setSecret("")}>
              {tr("已保存，关闭", "Saved, dismiss")}
            </Button>
          </div>
        </section>
      )}
      <form
        className="bg-white border border-slate-200 p-5 sm:p-6 rounded-xl space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = await api<{ token: string }>("/api/tokens", {
              json: {
                name,
                scopes: selected,
                expires_in_days: days,
                ...(qrId ? { qr_id: qrId } : {}),
              },
            });
            setSecret(result.token);
            setCopied(false);
            setName("");
            await load();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-lg font-semibold">
          {tr("创建 Access Token", "Create access token")}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-sm font-medium">{tr("名称", "Name")}</span>
            <input
              className={inputClass}
              required
              maxLength={80}
              placeholder={tr(
                "例如：微信群二维码",
                "e.g. Community QR shortcut",
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium">
              {tr("有效期", "Expires in")}
            </span>
            <select
              className={inputClass}
              value={days}
              onChange={(e) => setDays(+e.target.value)}
            >
              {[7, 30, 90, 365].map((d) => (
                <option key={d} value={d}>
                  {d} {tr("天", "days")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">
            {tr("可操作的活码", "QR access")}
          </span>
          <select
            className={inputClass}
            value={qrId}
            onChange={(e) => setQrId(e.target.value)}
          >
            <option value="">
              {tr("此账户的全部活码", "All QRs in this account")}
            </option>
            {qrs.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title || q.slug} · {q.id}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {tr(
              "给快捷指令使用时，建议限定到一个图片活码。限定 Token 不能新建活码。",
              "For Shortcuts, restrict access to one image QR. Restricted tokens cannot create QRs.",
            )}
          </p>
        </label>
        {qrId && (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <code className="break-all">{qrId}</code>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(qrId);
                } catch {
                  setError(
                    tr(
                      "无法复制 ID，请手动复制。",
                      "Unable to copy ID. Please copy manually.",
                    ),
                  );
                }
              }}
            >
              {tr("复制活码 ID", "Copy QR ID")}
            </Button>
          </div>
        )}
        <fieldset>
          <legend className="text-sm font-medium mb-2">
            {tr("权限", "Permissions")}
          </legend>
          <div className="flex flex-wrap gap-4">
            {scopes.map((s) => (
              <label key={s} className="flex gap-2 items-center text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(s)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, s]
                        : selected.filter((x) => x !== s),
                    )
                  }
                />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <Button
          disabled={
            busy || loading || !!secret || !name.trim() || !selected.length
          }
          type="submit"
        >
          {busy ? tr("处理中…", "Working…") : tr("创建 Token", "Create token")}
        </Button>
      </form>
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Access Tokens</h2>
        {loading ? (
          <p>{tr("加载中…", "Loading…")}</p>
        ) : !tokens.length ? (
          <p className="text-slate-500 text-sm">
            {tr(
              "还没有 Token。创建一个即可开始。",
              "No tokens yet. Create one to get started.",
            )}
          </p>
        ) : (
          <div className="divide-y">
            {tokens.map((t) => (
              <div
                className="py-4 flex flex-col sm:flex-row gap-3 sm:items-start"
                key={t.id}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-medium break-words">
                    {t.name}{" "}
                    <span className="text-xs text-slate-500">
                      {t.revoked_at
                        ? tr("已撤销", "Revoked")
                        : t.expires_at <= Date.now()
                          ? tr("已过期", "Expired")
                          : tr("有效", "Active")}
                    </span>
                  </h3>
                  <code className="text-xs text-slate-500">{t.prefix}…</code>
                  <p className="text-xs break-words">{t.scopes.join(" · ")}</p>
                  <p className="text-xs text-slate-500 break-all">
                    QR: {t.qr_id || tr("全部", "All")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {tr("到期", "Expires")}: {date(t.expires_at)} ·{" "}
                    {tr("最近使用", "Last used")}:{" "}
                    {t.last_used_at ? date(t.last_used_at) : "—"}
                  </p>
                </div>
                {!t.revoked_at && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          tr(
                            "撤销后，使用此 Token 的集成会立即失效。继续？",
                            "Revoke this token? Its integrations will stop working immediately.",
                          ),
                        )
                      )
                        return;
                      setBusy(true);
                      setError("");
                      try {
                        await api(`/api/tokens/${t.id}`, { method: "DELETE" });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {tr("撤销", "Revoke")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold mb-3">
          {tr("最近 API 请求", "Recent API requests")}
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          {tr(
            "最近 50 条，不记录 Token 明文或请求内容。",
            "Latest 50 requests. Token secrets and request bodies are never recorded.",
          )}
        </p>
        {!events.length && (
          <p className="text-sm text-slate-500">
            {tr("暂无记录", "No requests yet")}
          </p>
        )}
        <div className="space-y-2">
          {events.map((e) => (
            <div key={e.id} className="text-xs flex flex-wrap gap-2">
              <span className="text-slate-500">{date(e.created_at)}</span>
              <code className="break-all">
                {e.method} {e.path}
              </code>
              <span>{e.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

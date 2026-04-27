# MVP Implementation Plan

> **Status**: Active · **Last updated**: 2026-04-27 · 配套:[PRD.md](./PRD.md) · [MVP.md](./MVP.md)
>
> 每一步包含:**目标 / 输出 / 验收 / 回滚**。完成后在文件顶部勾选。

## 进度跟踪

- [x] Phase A — Cloudflare 资源 provisioning
- [x] Phase 0 — 架构重构(SPA → 多路由)
- [x] Phase B — 后端基础设施(D1 schema、auth 写库、工具)
- [x] Phase C — QR CRUD API + R2 上传
- [x] Phase D — 落地页 SSR
- [x] Phase E — 前端应用(Dashboard / 创建向导 / 详情)
- [x] Phase F — 分析(扫码计数 + 7d sparkline)
- [ ] Phase G — i18n + 营销页 + 法务静态页
- [ ] Phase H — 收尾(rate limit、404/500、白名单、E2E 冒烟、部署)

---

## Phase A · Cloudflare 资源 provisioning

**目标**:把 MVP 需要的所有 CF 边端资源建好,bindings 写入 `wrangler.toml`,本地能 `wrangler dev` 起服务而不报缺资源错。

| Step | 输出 | 验收 |
| --- | --- | --- |
| A1 | 创建 D1 数据库 `qrcode-service-db` | `wrangler d1 list` 能看到 |
| A2 | 创建 R2 bucket `qrcode-service-images` | `wrangler r2 bucket list` 能看到 |
| A3 | 创建 KV namespace `qrcode-service-kv` | `wrangler kv namespace list` 能看到 |
| A4 | 创建 Analytics Engine dataset `qrcode_scans`(在 wrangler.toml 声明即可) | 部署不报错 |
| A5 | 把 4 个 binding 写进 wrangler.toml | `wrangler deploy` 成功 |
| A6 | 写 D1 migration `0001_init.sql`(users / qrs / scan_counters) | `wrangler d1 migrations apply --local`、`--remote` 双成功 |
| A7 | 更新 `worker/index.ts` 的 `Bindings` 类型,加上 `DB / IMAGES / CACHE / SCAN_EVENTS` | `npx tsc -p worker/tsconfig.json` 通过 |

**回滚**:`wrangler d1 delete` / `wrangler r2 bucket delete` / `wrangler kv namespace delete`。MVP 没有写真实数据,删除无副作用。

---

## Phase 0 · 架构重构

**目标**:把当前单页 SPA 改造成多路由 + SSR 落地页。**这是 MVP 最大的代码改动**,先单独成阶段做完再继续。

| Step | 输出 |
| --- | --- |
| 0.1 | 安装 `react-router` v7(单一 SPA 路由器,SSR 落地页**不**走它) |
| 0.2 | 重组 `src/`:`src/pages/`、`src/layouts/`、`src/components/`、`src/lib/`、`src/hooks/` |
| 0.3 | 创建 router(`src/router.tsx`)+ 5 条骨架路由:`/`、`/login`、`/app`、`/app/tools/static-qr`、`*` |
| 0.4 | `MarketingLayout`(顶部 Logo + 简洁 header)与 `AppLayout`(sidebar + 顶部用户菜单)空壳 |
| 0.5 | 把现有 `App.tsx` 的静态 QR UI 移到 `src/pages/tools/StaticQrTool.tsx`,并在 `/app/tools/static-qr` 挂上 |
| 0.6 | `src/pages/Login.tsx` 单按钮"Continue with Google"页 |
| 0.7 | `src/pages/Marketing.tsx` 占位首页(空 Hero + CTA) |
| 0.8 | `RequireAuth` 组件:未登录跳 `/login` |
| 0.9 | 使用 `useAuth()` 把现有 hook 移到 `src/hooks/useAuth.ts`(从 `src/auth.ts`)|
| 0.10 | Worker 的 `/q/:slug` 路由用 Hono **JSX renderer** 直出 HTML(占位"Hello slug") |
| 0.11 | Worker `wrangler.toml` 的 `assets.run_worker_first` 改为 `["/api/*", "/q/*"]`,确保 `/q/*` 走 Worker SSR |

**验收**:
- `npm run dev` 后访问 `http://localhost:3000/`、`/login`、`/app`、`/app/tools/static-qr` 各自渲染对应壳;`/q/anything` 由 Worker 直出 "Hello anything"。
- 静态 QR 工具行为不变(只是位置换了)。

---

## Phase B · 后端基础设施

**目标**:写 D1 用户、工具函数、错误处理 middleware、运行时 schema 校验。

| Step | 输出 |
| --- | --- |
| B1 | `worker/db.ts`:D1 helpers(`getUser`、`upsertUser`、`createQr`、`getQrBySlug`、`getQrById`、`listUserQrs`、`updateQr`、`deleteQr`)|
| B2 | `worker/ids.ts`:ulid 生成 + slug 生成器(8 位 base32,冲突重试 3 次)|
| B3 | `worker/auth/callback` 改造:OAuth 成功后 `upsertUser` 拿到 D1 user.id,写入 JWT payload `uid` |
| B4 | `worker/middleware.ts`:`requireAuth`(读 JWT,注入 `c.set('user', ...)`)|
| B5 | `worker/schemas.ts`:zod schemas — `targetSchema`(三种 union)、`createQrInput`、`updateQrInput`、`uploadInitInput` |
| B6 | 全局错误处理 + 统一响应:`{ ok: true, data }` / `{ ok: false, error: { code, message } }` |

**验收**:`/api/auth/me` 返回的对象现在带 D1 user.id;首次登录在 D1 看到 1 行;tsc 全绿。

---

## Phase C · QR CRUD API + R2 上传

| Step | 输出 |
| --- | --- |
| C1 | `POST /api/qrs` 创建(分配 slug、写 D1) |
| C2 | `GET /api/qrs` 列表(当前用户、按 updated_at desc) |
| C3 | `GET /api/qrs/:id` 详情(含 target_payload + scan_counter)|
| C4 | `PATCH /api/qrs/:id` 更新元数据 / status / target,改 target 时 `KV.delete('target:'+slug)` |
| C5 | `DELETE /api/qrs/:id` 物理删除(级联清 R2 对象、KV、scan_counters)|
| C6 | `POST /api/uploads/image` R2 presigned PUT(签名包内 size limit、content-type 限制)|
| C7 | URL 校验工具:拒 `javascript:`、`data:`、私网、localhost |

**验收**:用 `curl` 走通 5 个接口;前端不参与;R2 dashboard 能看到测试图片。

---

## Phase D · 落地页 SSR

| Step | 输出 |
| --- | --- |
| D1 | Hono JSX 模板:`Layout.tsx`(共享 head / 关键 CSS inline) |
| D2 | `ImageView.tsx`、`UrlInterstitialView.tsx`、`MultilinkView.tsx`、`ErrorView.tsx` |
| D3 | `/q/:slug` handler:KV 命中 → 直接渲染;miss → D1 查 → KV `put` 60s → 渲染 |
| D4 | 异步副作用:`event.waitUntil(incrementScanCounter() + writeAnalytics())` |
| D5 | 暂停 / 不存在 / 用户删除 状态 → `ErrorView` 各自文案 |
| D6 | 落地页 i18n(读 cookie 或 `Accept-Language`,en/zh-CN 两套文案)|

**验收**:
- 三种 target 各扫一次,渲染正确,首屏 HTML <50KB
- 改 target 后 60s 内扫码看到新内容
- D1 `scan_counters.total` 增加
- Analytics Engine query 能看到事件

---

## Phase E · 前端应用

| Step | 输出 |
| --- | --- |
| E1 | `Dashboard.tsx`:卡片网格、空态、"+ New QR" 按钮 |
| E2 | `NewQrWizard.tsx`:Stepper(类型选择 → 配置 → 完成),含三种 target 的子表单组件 |
| E3 | 三个 Target 表单子组件:`ImageTargetForm` / `UrlTargetForm` / `MultilinkTargetForm`(共用接口)|
| E4 | `QrDetail.tsx`:左大 QR 预览(用 `qrcode` 客户端生成 SVG / PNG),右 Tab(Target / Analytics / Settings)|
| E5 | 下载 QR PNG(canvas → blob → download)|
| E6 | `QrDetailEdit.tsx`:复用 E3 表单,Save → PATCH → 刷新 |
| E7 | `Account.tsx`:资料 + 登出 |
| E8 | Header 用户菜单(头像 + 下拉:Dashboard / Account / Logout)|
| E9 | `useQrs()`、`useQr(id)`、`useCreateQr()`、`useUpdateQr()`、`useDeleteQr()` —— 简单 fetch + 内存缓存(不上 react-query,够用) |

**验收**:全主链路 click 可达,无类型错误,移动端布局可用。

---

## Phase F · 分析

| Step | 输出 |
| --- | --- |
| F1 | `GET /api/qrs/:id/analytics?range=7d` 走 Analytics Engine SQL 聚合 |
| F2 | `Sparkline.tsx`(纯 SVG 画 7 个点) |
| F3 | 详情页 Analytics tab 接入 |

**验收**:产生 ≥10 次扫码,Analytics tab 显示总数 + 7 天折线。

---

## Phase G · i18n + 营销页 + 法务

| Step | 输出 |
| --- | --- |
| G1 | `react-i18next` 接入,`src/locales/{en,zh-CN}/common.json` |
| G2 | 应用后台所有文案抽 key |
| G3 | 营销首页 `Marketing.tsx` 完整内容(Hero / 三场景 / 三种 target / FAQ / CTA)|
| G4 | `/terms`、`/privacy`、`/help` Markdown 静态页(`vite-plugin-markdown` 或直接 JSX)|
| G5 | 落地页 i18n(D6 已有基础,检查覆盖)|

**验收**:UI 中文/英文切换无遗漏 hard-coded 字符串。

---

## Phase H · 收尾

| Step | 输出 |
| --- | --- |
| H1 | 速率限制 middleware(KV-based,登录前 IP 维度,登录后 uid 维度)|
| H2 | 404 / 500 友好页(SPA 端 + Worker 端)|
| H3 | 种子白名单:`users.is_seed`,非白名单看"内测申请"占位页(无后端表单,仅显示邮件联系方式) |
| H4 | E2E 冒烟脚本(playwright 或 curl 序列):login → create(image) → scan → edit → scan → delete |
| H5 | 部署 production:`npm run deploy`,跑 D1 migration `--remote`,把白名单种子用户邮箱写入 |
| H6 | Lighthouse 落地页 mobile 验证 ≥90/95 |

---

## 执行约定

- 每个 Phase 完成后 commit 一次,commit message 形如 `feat(phase-A): provision CF resources`
- 每个 Phase 跑一次 `npm run lint` + `npx tsc -p worker/tsconfig.json` + `npm run build`,绿了再下一个
- 不在 MVP 过程中预留"未来配置位"或注释 TODO,需要的功能等到那一阶段再加
- Phase 边界明确停下,等用户确认或继续指令(用户说"继续"或"下一步"即推进)

# v1.1 Implementation Plan — Beta-Ready

> **Status**: Draft v0.1 · **Last updated**: 2026-05-07 · 配套:[PRD.md](./PRD.md) · 前序:[PLAN.md](./PLAN.md)
>
> 每一步包含:**目标 / 输出 / 验收 / 回滚**。完成后在文件顶部勾选。

## 当前基线（截至本文档起草）

- MVP Phase A–F 已交付,营销首页已迁出仓库到独立站 `pandaqr.xyz`
- 7 种语言 i18n、过期提醒、短域名 `q.pandaqr.xyz/<slug>`、Note、PNG/JPG/SVG 下载已上线
- 仍未做:rate limit、友好 404/500、`/help` 静态文档、自定义 QR 样式、历史版本、自定义 slug

## v1.1 目标(一句话)

**让"永久 QR"的承诺真正闭环 —— 用户可以放心改、改错能撤、想要个性化能改造、并且公开域名上有最低限度的滥用保护。**

## 进度跟踪

- [ ] Phase J — Trust & 完整性(历史版本 + 软删宽限期)
- [ ] Phase K — 自定义 & 差异化(自定义 slug + QR 样式)
- [ ] Phase L — 分析升级(国家 + 设备维度)
- [ ] Phase M — 公测就绪(rate limit + 404/500 + /help)

---

## Phase J · Trust & 完整性

**目标**:补齐 PRD §4.6(历史版本回滚)和 §4.2(软删 30 天宽限期)。修补"承诺永久但改错没救"的体验漏洞。

**前置数据模型变更**

```sql
-- 0005_target_history.sql
CREATE TABLE target_versions (
  id          TEXT PRIMARY KEY,           -- ulid
  qr_id       TEXT NOT NULL REFERENCES qrs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,              -- image | url | multilink
  payload     TEXT NOT NULL,              -- JSON
  version     INTEGER NOT NULL,           -- 单 QR 内单调递增
  created_at  INTEGER NOT NULL,
  created_by  TEXT                        -- user_id, 暂等于 owner, 为后续多人协作预留
);
CREATE INDEX idx_target_versions_qr ON target_versions(qr_id, version DESC);
```

`qrs.target_*` 列保留(继续作为 current);**每次 PATCH target 时,先把"被替换前的旧 target"写入 `target_versions`**,即历史 = 旧版本归档,current 仍读自 qrs 行。这样落地页 SSR 路径零变更。

| Step | 输出 | 验收 |
| --- | --- | --- |
| J1 | `0005_target_history.sql` migration + `target_versions` 表 | local + remote 迁移成功 |
| J2 | `worker/lib/db.ts` 加 `archiveCurrentTarget(qrId)` + `listTargetVersions(qrId)` + `restoreTargetVersion(qrId, versionId)`(后者 = 把指定 version 写回 qrs.target_*,并把当前 current 再归档一份) | 单元 / curl 验证三个操作 |
| J3 | `PATCH /api/qrs/:id` 中 target 字段变更前调用 `archiveCurrentTarget` | curl PATCH 后 `target_versions` 多一行 |
| J4 | 新接口:`GET /api/qrs/:id/versions`、`POST /api/qrs/:id/versions/:vid/restore` | curl 双向走通 |
| J5 | 前端 `QrDetail` 加 "History" Tab(时间轴 + payload 摘要 + Restore 按钮) | 改 → 改 → 改 → 列表 3 条,点 Restore 内容回滚,Toast 反馈 |
| J6 | 软删宽限:`qrs.deleted_at` 标记(已有列复用),DELETE 改为软删;落地页对 `deleted_at` 非空且 30 天内的 slug 显示"已下线"页(已有 ErrorView 文案,新增"下线"分支);超 30 天的物理清理走 cron | 删 → 30 天内扫显示下线;手动调整 deleted_at 模拟 30 天后,扫显示 not found |
| J7 | (可选)Dashboard 加"已删除"过滤项,允许 30 天内一键恢复 | 删 → 列表过滤可见 → Restore 回 active |

**回滚**:`DROP TABLE target_versions`;前端 History Tab 隐藏即可。软删可改回硬删(`deleted_at` 留着不读)。

---

## Phase K · 自定义 & 差异化

**目标**:解决 PRD §4.2 列出的两个 v1.1 事项 —— 自定义 slug、自定义 QR 视觉样式(颜色 + Logo)。

| Step | 输出 | 验收 |
| --- | --- | --- |
| K1 | `qrs.slug` 创建时支持自定义。Reserved 名单(写在代码常量):`api`、`q`、`r`、`app`、`admin`、`login`、`logout`、`new`、`account`、`tools`、`help`、`terms`、`privacy`、`pricing` 等 | 创建向导第 1 步加可选 slug 输入框,实时校验冲突 + reserved + 长度(3-32) + 字符集(`[a-z0-9-]`) |
| K2 | `qrs` 表加三列:`style_fg TEXT`、`style_bg TEXT`、`style_logo_r2_key TEXT`(均可空,空 = 默认黑白无 logo) | 0006 migration |
| K3 | `QRPreview` 与三个 `download*` 函数读取这三个值,绘制时应用前/背景色和居中嵌入 logo(占用中心 ~20% 面积,error correction 已是 M,够用) | 自定义颜色后下载 PNG,打开看到指定颜色 |
| K4 | 详情页 Settings Tab 新增"Style"区块:两个 color picker + logo 上传(走已有 `/api/uploads/image` 接口) | 改样式 → 保存 → 重载详情页预览生效 |
| K5 | 创建向导第 2 步加可折叠 "Style" 面板,默认收起 | 新建 QR 时可一次性设好样式 |
| K6 | i18n:7 种语言加 `detail.style.*` 与 `wizard.style.*` keys | 切换语言无 hard-coded 文案 |

**回滚**:三列 + Style UI 可单独下线,旧 QR 的 style_* 为 NULL 时按默认渲染,无破坏性。

**风险**:logo 嵌入会降低扫码可靠性。约束:logo 占中心 20% 面积,且强制 error correction = `H`(当前是 `M`),保留扫描容错冗余。

---

## Phase L · 分析升级

**目标**:落实 PRD §4.5。落地页 SSR 时已能从 `cf` 拿 country/device,只是没存。补一张 D1 表存维度计数,详情页 Analytics Tab 新增两个图。

**数据模型**

```sql
-- 0007_scan_breakdown.sql
CREATE TABLE scan_country_daily (
  qr_id    TEXT NOT NULL,
  date     TEXT NOT NULL,            -- YYYY-MM-DD UTC
  country  TEXT NOT NULL,            -- ISO 2-letter, "??" for unknown
  count    INTEGER NOT NULL,
  PRIMARY KEY (qr_id, date, country)
);

CREATE TABLE scan_device_daily (
  qr_id    TEXT NOT NULL,
  date     TEXT NOT NULL,
  device   TEXT NOT NULL,            -- mobile | desktop | tablet | bot | unknown
  count    INTEGER NOT NULL,
  PRIMARY KEY (qr_id, date, device)
);
```

| Step | 输出 | 验收 |
| --- | --- | --- |
| L1 | 0007 migration | 双向迁移成功 |
| L2 | 落地页扫码事件 `event.waitUntil` 中:除现有 scan_daily 自增,再 upsert 上述两张表(`country = c.req.raw.cf?.country`、`device = parse-ua` 简化版) | 真扫一次,三张表都 +1 |
| L3 | `GET /api/qrs/:id/analytics?range=7d` 响应扩展:`{ daily, country: [{code, count}], device: [{type, count}] }`(取 range 内聚合) | curl 返回结构正确,排序按 count desc |
| L4 | 前端 Analytics Tab 加 Top-5 国家条形列表 + 设备占比环形图(纯 SVG,不引图表库) | UI 显示与 curl 一致 |
| L5 | i18n:`detail.analytics.country` / `detail.analytics.device` / 设备名称(mobile/desktop/tablet)7 语言 | 切换语言无 hard-coded |

**回滚**:DROP 两张表;Analytics Tab 隐藏新区块;聚合接口字段保持向后兼容(可选字段)。

---

## Phase M · 公测就绪

**目标**:补齐 MVP Phase H 未做的 rate limit + 404/500 + `/help`,把 app.pandaqr.xyz 推到"可面向不认识的人发"的状态。

| Step | 输出 | 验收 |
| --- | --- | --- |
| M1 | `worker/lib/rateLimit.ts`:KV-based 滑动窗口,key 形如 `rl:<scope>:<id>:<bucket>`,1 分钟桶。封装成 `withRateLimit(scope, perMin, idResolver)` middleware | 单测:连续打 N+1 次第 N+1 返回 429 |
| M2 | 给敏感路由挂限流:`/api/auth/google` 5/min/IP、`/api/qrs` POST 30/min/uid、`/api/uploads/image` 30/min/uid、`/q/:slug` 600/min/IP(防爬) | 用 ab / xargs curl 验证返回 429 |
| M3 | Worker `notFound` + `onError` handler 返回友好 HTML(走现有 `Error.tsx` view) | 直接访问 `/q/__no__` 看到友好页;故意抛错看到 500 友好页 |
| M4 | SPA 端:已有 `NotFound.tsx`,补一个 ErrorBoundary 包 `<Outlet/>`,异常显示与 NotFound 同风格的 500 页 | 在 Dashboard 故意 throw,看到 500 页 |
| M5 | `/help` 路由:静态 Markdown(en/zh/ja/ko/de/fr/vi)`docs/help/{lang}.md` → vite-plugin-markdown 编译 → MarketingLayout 套壳渲染 | 7 种语言切换显示对应 markdown,内容覆盖:创建 QR、改内容、过期提醒、下载、删除恢复 |
| M6 | `npm run deploy` 走一次,smoke test:登录 → 创建 → 改 target → 历史回滚 → 删除 → 30 天内恢复 → 改样式 → 真机扫 | 全链路绿 |

**回滚**:rate limit 可下掉中间件即可;404/500 页样式问题可临时还原默认 Worker 兜底。

---

## 执行约定

- 每个 Phase 完成后 commit 一次,commit 形如 `feat(phase-J): target version history & rollback`
- 每个 Phase 跑 `npm run lint`(已含 worker tsc),绿了再下一阶段
- 不预留"未来配置位"或注释 TODO,需要的功能等到那一阶段再加
- Phase 边界明确停下,等用户确认或继续指令
- migration 文件按 `0005_*` 起编号,远端 `npm run migrate:remote` 必须在 `npm run deploy` 之前运行(已由 `deploy` script 自动串联)

## 开放问题

- 历史版本上限:无限保留 vs 仅保留最近 N 条?默认无限,待容量观察
- 软删 30 天清理 cron:复用现有 expiry cron(`5 * * * *`)还是单独一条?倾向复用,避免 cron 蔓延
- Logo 嵌入是否对 URL target 默认开启?当前规划是默认关,用户主动配置才显示
- /help 是否走 SSR(SEO)还是 SPA 内渲染?倾向 SPA 内,不阻塞首屏,help 不走 SEO 流量

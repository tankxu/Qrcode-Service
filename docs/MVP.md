# MVP Scope — Permanent QR

> **Status**: Draft v0.1 · **Last updated**: 2026-04-27 · 配套文档:[PRD.md](./PRD.md)

---

## 0. MVP 目标(一句话)

**让一个登录用户能在 5 分钟内创建一个永久 QR、绑定图片或链接、并把它印在物料上;扫码者能从全球任何地方在 1.5 秒内看到当前内容。**

---

## 1. 哲学

- **闭环优先,功能克制**:从注册 → 创建 → 分发 → 扫码 → 改内容 → 再扫码,这条主链路必须 100% 跑通。其他能砍则砍。
- **付费 / 邮件 / 审核全部不做**:用户来了就能用全功能,也意味着我们暂不开放注册之外的传播(只口头分享给目标种子用户),以免冷启动期出现滥用。
- **不写未来兼容代码**:数据模型按 PRD 定型,实现按 MVP 范围,**不预留配置位 / 不留 TODO 桩**。

---

## 2. In Scope(必须做)

### 2.1 身份

- ✅ Google OAuth 登录(已实现)
- ✅ HttpOnly JWT cookie session(已实现)
- 🆕 首次登录在 D1 `users` 写入用户记录;`/api/auth/me` 返回 D1 用户 id

### 2.2 Permanent QR 管理

- 🆕 创建 QR(系统自动分配 8 位 base32 slug,无自定义 slug)
- 🆕 列表 Dashboard:卡片网格、按更新时间倒序、显示总扫码数
- 🆕 详情页:QR 大图、当前 target 摘要、总扫码数、7 天 sparkline、操作入口
- 🆕 元数据编辑:title、description
- 🆕 status:active / paused 切换(无软删宽限期,删除直接物理删除 + R2 清理)
- 🆕 下载 QR 图片:**PNG only**(SVG/JPG 推迟)
- ❌ 自定义 slug
- ❌ 自定义 QR 样式(颜色、Logo 嵌入)

### 2.3 Target 类型

三种全部做,但每种只做最简形态:

#### Image
- 上传单张图,格式 PNG/JPG/WebP,**≤2MB**
- 直传 R2(Worker 签 presigned URL,前端直传)
- 不做服务端转码,直接存原图
- 落地页:全屏大图 + 标题(可选)+ "长按保存" 提示

#### URL
- 输入 http/https 链接
- **永远走中间确认页**(显示目标 host + "Continue" 按钮 + 1.5s 后自动跳)
- 简单 URL 黑名单(localhost、私网、`javascript:`、`data:`)

#### Multilink
- 标题 + 简介 + 链接列表(label + url)
- 不支持头像、icon、主题
- 列表上限 10 条
- 拖拽排序(用 `@dnd-kit/sortable`)

### 2.4 扫码落地页 `/q/:slug`

- Worker SSR 直出 HTML
- target 数据 KV 缓存(60s TTL,变更时失效)
- 三种 target 类型分别渲染
- 错误页:slug 不存在 / 已暂停 / 用户已删除
- **不做暗色模式、不做"打开微信扫一扫"提示**(v1 加)

### 2.5 扫码分析(最简版)

- 计数器:`scan_counters.total` 自增(D1 update,失败重试 3 次)
- 7 天 sparkline:基于 Analytics Engine 写入扫码事件(`qr_id, ts, country`),查询时聚合
- ❌ UV 去重(MVP 只显示总扫码,不区分 UV)
- ❌ 国家 / 设备分布(等 v1)

### 2.6 用户设置 `/app/account`

- 显示资料(只读)
- 登出
- ❌ 删除账号(v1)
- ❌ 数据导出

### 2.7 静态 QR 生成器

- 沿用现有 `App.tsx` 实现,移到 `/app/tools/static-qr`,作为附属工具

### 2.8 营销页 `/`

- 单页 long-scroll:Hero / 三场景 / 三种 target / FAQ / 底部 CTA
- 仅英文 + 简体中文
- 静态,无 CMS

### 2.9 i18n

- en + zh-CN,`react-i18next`
- 应用后台与扫码落地页全部接入
- 用户偏好存 cookie(MVP)

### 2.10 法务

- `/terms`、`/privacy`、`/help`(纯 Markdown 静态页)
- 内容由 Tank 起草

---

## 3. Out of Scope(明确不做)

| 类别 | 原因 |
| --- | --- |
| 付费 / Stripe | 暂不收费 |
| 邮件发送(magic link、收据、告警) | CF 无原生发信能力,例外不做 |
| 内容审核(Workers AI 图像、举报、人工队列) | 用户提示明确"仅限种子用户" |
| Turnstile / 反机器人 | 暂无开放注册之外的形式 |
| 团队 / 协作 / 角色 | 单用户 |
| 自定义域名 | v1.4 |
| API / Webhook | v1.4 |
| 批量 CSV 导入 | v1.4 |
| 自定义 QR 样式 | v1.1 |
| 历史版本 / 回滚 | v1.1(MVP 只保留 current target,旧的覆盖) |
| 密码保护 / 时间窗口 / 阅后即焚 | v1.3 |
| 暗色模式落地页 | v1.1 |
| 暗色模式后台 | v1.1 |
| Sentry / 高级监控 | v1 上 |
| SEO / sitemap / 多语言 hreflang | v1 上 |
| 数据导出 / 删除账号 | v1(GDPR 要求,但 MVP 阶段用户量极少,可手动) |

---

## 4. MVP 数据模型(D1 子集)

只创建 PRD 中定义的 4 张表中的 3 张,**砍掉 `targets` 的版本字段**:

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  google_sub  TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  name        TEXT,
  picture     TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE qrs (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  target_type TEXT NOT NULL,           -- image | url | multilink
  target_payload TEXT NOT NULL,        -- JSON;MVP 直接存当前 target,无版本表
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX idx_qrs_user ON qrs(user_id);

CREATE TABLE scan_counters (
  qr_id        TEXT PRIMARY KEY REFERENCES qrs(id) ON DELETE CASCADE,
  total        INTEGER NOT NULL DEFAULT 0,
  last_scan_at INTEGER
);
```

> Analytics Engine dataset:`scan_events { qr_id, ts, country }`(无需建表)

---

## 5. MVP API 清单

```
✅ GET    /api/auth/google                已实现
✅ GET    /api/auth/callback              已实现(MVP 增:首登写 D1 users)
✅ GET    /api/auth/me                    已实现
✅ POST   /api/auth/logout                已实现

🆕 GET    /api/qrs                        列表
🆕 POST   /api/qrs                        创建 { title?, description?, target: {...} }
🆕 GET    /api/qrs/:id                    详情(包含 target 和 scan 计数)
🆕 PATCH  /api/qrs/:id                    更新元数据 / target / status
🆕 DELETE /api/qrs/:id                    硬删

🆕 POST   /api/uploads/image              R2 直传签名 → { upload_url, r2_key, public_url }
🆕 GET    /api/qrs/:id/analytics?range=7d   返回 { total, daily: [{date, count}] }

🆕 GET    /q/:slug                        SSR 落地页
🆕 GET    /q/:slug/raw                    内部:从 KV/D1 取 target 数据(供 SSR)
```

---

## 6. 技术任务清单(可领取的 issue 粒度)

> 顺序为粗略依赖顺序;同层可并行。

### Phase A · 基础设施

1. 在 wrangler.toml 加 D1、R2、KV、Analytics Engine bindings
2. 写 D1 migration(3 张表),`wrangler d1 migrations apply`
3. R2 bucket 创建 + 公共读策略 + 直传 worker 端签名实现
4. KV namespace 创建,Worker 端 `target:<slug>` 读写工具

### Phase B · 后端核心

5. `users` 写入逻辑(OAuth callback 中,upsert by `google_sub`)
6. `/api/qrs` CRUD 接口(含 slug 生成器、URL 校验、JSON payload 校验 zod)
7. R2 直传签名接口
8. 落地页 SSR(Hono JSX 或 hono/jsx-renderer)
9. 扫码计数器 + Analytics Engine 写入(`/q/:slug` 命中后异步 `event.waitUntil`)
10. `/api/qrs/:id/analytics` 聚合查询

### Phase C · 前端应用

11. 路由架构:**改用 react-router**(当前是单页),区分 `/`、`/login`、`/app/*`、`/q/:slug` 不在 SPA 内
12. 受保护路由:未登录跳 `/login`
13. Dashboard(列表 + 创建按钮 + 卡片)
14. 创建向导(Stepper + 三种 target 表单 + 预览)
15. 详情页(QR 大图 + 下载 + Tab:Target / Analytics / Settings)
16. 编辑 target 表单(三种共用容器 + 类型分支)
17. 静态 QR 生成器迁移到 `/app/tools/static-qr`
18. 账号设置(资料 + 登出)
19. Header 替换:登录后显示头像 + dropdown(到 Dashboard / 账号 / 登出)

### Phase D · 落地页

20. SSR 模板(image/url/multilink 三种 + 错误页)
21. 落地页 i18n(根据 `Accept-Language` + 用户 cookie)
22. 关键 CSS inline、骨架屏、字体异步

### Phase E · i18n & 营销

23. `react-i18next` 接入,en/zh-CN 文案表
24. 营销首页(`/`)+ 三场景图 + FAQ
25. `/terms`、`/privacy`、`/help` 静态页

### Phase F · 收尾

26. 速率限制(KV 简单实现:per-uid 创建 60/min,per-IP 上传 30/min)
27. 错误页 / 404 / 500 友好兜底
28. 端到端冒烟:登录 → 创建 → 扫码 → 改 → 再扫码,每种 target 类型走一遍
29. 部署生产 + 把 dev 数据全清,种子用户白名单(必要时在 OAuth callback 校验 email)

---

## 7. 验收标准(MVP 达标 = 全部通过)

- [ ] 新用户从未登录到完成首个 QR 创建,**< 5 分钟**(含下载 PNG)
- [ ] 三种 target 类型各创建一条,扫码落地页**全球任意地区**首屏 < 1.5s(用 webpagetest 或 CF Speed Test 多地点验证)
- [ ] 修改 target 后,**新一次扫码**在 60s 内看到新内容(KV TTL 上限)
- [ ] Dashboard、创建向导、详情页、扫码落地页在 iPhone Safari、Android Chrome、Desktop Chrome 三端布局正常
- [ ] 切 zh-CN ↔ en,所有文案正确
- [ ] D1 / R2 / KV / Analytics Engine 全部从 `wrangler.toml` bindings 工作,无运行时报错
- [ ] 删除一个 QR,对应 R2 对象、D1 行、KV 缓存全部清理
- [ ] Lighthouse 落地页 mobile 分数:Performance ≥ 90、Accessibility ≥ 95
- [ ] 不依赖任何 CF 外部服务(Stripe / Resend / 邮件 / Sentry 在 MVP 不需要)

---

## 8. 时间估算

> 按 1 个全职开发,经验丰富,使用 AI 辅助。仅供参考。

| Phase | 估算 |
| --- | --- |
| A 基础设施 | 1 天 |
| B 后端 | 3 天 |
| C 前端 | 5 天 |
| D 落地页 | 2 天 |
| E i18n & 营销 | 2 天 |
| F 收尾 | 1 天 |
| **合计** | **~14 个工作日(3 周)** |

---

## 9. 风险登记

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 微信内置浏览器对图片下载 / 长按行为差异 | 中(核心场景) | 落地页针对 UA 做条件提示,实测 |
| D1 写入速率上限(扫码计数高并发) | 低(MVP 流量不会到瓶颈) | 后续切换到 Durable Object 计数 |
| R2 公共读对象被恶意调用产生流量 | 中 | 文件名带随机段、Worker 反代而非直发(v1 上) |
| 滥用账号上传违法图片(无审核) | 高 | MVP 阶段**仅限种子用户白名单**,白名单存 D1 `users.is_seed` 字段;非白名单 OAuth 通过但拒绝创建 QR |
| Google OAuth scope 变化 | 低 | 只用 `openid email profile` |

---

## 10. MVP 之后,最近会做什么

紧贴 PRD 路线图,排第一档的是 **v1.1**:

- 历史版本 / 回滚
- 自定义 QR 样式(色彩、Logo 嵌入)
- 扫码分析升级(国家、设备、时间分布)
- 暗色模式
- 数据导出 / 删除账号

接下来才是反滥用、邮件、付费。

# Product Requirements Document — Permanent QR

> **Status**: Draft v0.1 · **Last updated**: 2026-04-27 · **Owner**: Tank
>
> **Working name**: `QuickQR`(沿用当前仓库品牌)。候选替代:`EverQR` / `PinQR` / `LinkQR` / `LiveQR`。最终命名 TBD。

---

## 1. 产品概述

### 1.1 一句话定义

**让一个 QR 码永远不过期、永远指向最新内容。**

### 1.2 问题陈述

世界上大量"邀请入口"是会过期或会变化的:

- **微信群二维码** 7 天后失效
- **Telegram / WhatsApp / Discord / Line 邀请链接** 可被撤销或滚动
- **活动报名页 / 表单** 链接可能换平台
- **餐厅菜单 / 价目表 / 名片** 内容随时会更新

但用户**已经把 QR 码印在了**:海报、易拉宝、产品包装、餐桌、贴纸、名片、广告位、PPT、公众号封面…… 一旦 QR 失效,**整批物料作废**。

### 1.3 解决方案

平台给每个用户分配一个**永久不变的二维码**,QR 编码的是平台稳定 URL `https://app.example.com/q/<slug>`。
扫码后落到平台落地页,实时展示**当前**绑定的目标内容(图片 / 跳转链接 / 多链聚合页)。
用户在后台随时更换"目标内容",但 QR 本身永远不变。

### 1.4 价值主张

| 对印刷 / 物料投放方 | 对接收方 |
| --- | --- |
| 物料一次成型,永久复用 | 扫一个码,总能拿到最新入口 |
| 可统计每张物料的扫码效果 | 落地页加载快、移动端友好 |
| 内容失效不需要重新印刷 | 不需要装额外 App |

---

## 2. 目标用户与场景

### 2.1 用户画像

| 画像 | 描述 | 痛点 | 核心场景 |
| --- | --- | --- | --- |
| **社群运营者** | 微信/Telegram/WhatsApp 群主、社区主理人、付费社群课程作者 | 群码 7 天过期,海报和公众号文章里的码反复失效 | 群码常驻入口 |
| **小商家 / 自由职业者** | 餐厅、咖啡店、美甲店、独立设计师 | 菜单、价目表、作品集变动频繁,改一次印一次 | 菜单 / 作品集页 |
| **活动 / 营销策划方** | 线下展会、快闪、市场活动、教育机构招生 | 物料投出去后链接换平台、活动迭代,旧物料浪费 | 活动落地页 |
| **创作者 / KOL** | 多平台账号(IG/X/小红书/YouTube/Telegram)聚合 | 名片/包装/视频片尾上没法塞多个链接 | 多链聚合页(类 Linktree) |

地理:**全球**。短期重点 = 中文市场(微信群码刚需) + 全球 Telegram/WhatsApp/Discord 用户。语言起步 EN + zh-CN。

### 2.2 核心使用旅程

**创建者(Owner)**:

1. Google 登录
2. 创建一个 Permanent QR → 选择目标类型(图片 / 链接 / 多链聚合)→ 配置内容
3. 下载 QR 图片(PNG / SVG)→ 印刷或贴出
4. 内容过期或换 → 后台一键替换,QR 不动

**扫码者(Visitor)**:

1. 扫 QR → 浏览器打开 `app.example.com/q/<slug>`
2. 立刻看到当前目标内容(图片大图 / 自动跳转 / 多链按钮列表)
3. 一步可达目标(打开微信扫一扫识别群码 / 跳目标 / 点链接)

### 2.3 与竞品差异

| 类别 | 代表 | 我们的差异 |
| --- | --- | --- |
| 静态 QR 工具 | qr-code-generator.com、草料二维码 | 我们的 QR **可改内容**,他们的不行 |
| 动态 QR / Smart Link 平台 | QRTiger、Beaconstac、Bitly | 价格更轻、UX 更聚焦"群码续命"场景、中文优化 |
| 多链聚合页 | Linktree、Beacons、bento.me | 我们以 QR 为入口,聚合页是其中一种目标类型 |

**单点突破**:**微信群码永久化**这个垂直场景在英文工具里完全没人做,在中文工具里方案碎片化。

---

## 3. 信息架构(Sitemap)

```
公开侧(无需登录)
├─ /                     营销首页(Hero / 场景演示 / 功能介绍 / CTA)
├─ /q/:slug              扫码落地页(根据 target 类型动态渲染)
├─ /login                登录(单按钮:Google)
├─ /pricing              定价(MVP 占位 "Free during beta")
├─ /help                 帮助文档(Markdown 静态)
├─ /terms                服务条款
└─ /privacy              隐私政策

应用侧(需登录,/app/*)
├─ /app                  Dashboard:Permanent QR 列表
├─ /app/new              创建向导(3 步)
├─ /app/q/:id            QR 详情(预览 + 当前 target + 操作入口)
├─ /app/q/:id/target     编辑 target(按类型不同表单)
├─ /app/q/:id/analytics  扫码分析
├─ /app/q/:id/history    历史版本(target 变更记录,可回滚)
├─ /app/q/:id/settings   QR 设置(标题、状态、删除)
├─ /app/tools/static-qr  静态 QR 生成器(沿用当前生成器作为附属工具)
├─ /app/account          账号设置(资料、登出、删除账号)
└─ /app/usage            使用情况(MVP 后:订阅、用量配额)
```

---

## 4. 功能模块

### 4.1 身份与账号

- **登录**:Google OAuth(已实现)
- **会话**:HttpOnly + 签名 JWT cookie,7 天有效期(已实现)
- **账号资料**:头像、昵称、邮箱(均来自 Google profile,只读)
- **登出 / 删除账号**:删除账号会级联删除所有 QR、target、scan 数据

### 4.2 Permanent QR 管理

- **创建**:系统分配唯一 slug(8 位 base32,随机生成,冲突重试);用户可选择自定义 slug(预留 reserved 名单)
- **元数据**:title、description、is_active(暂停时扫码落地页提示"已暂停")
- **列表**:卡片网格 / 列表切换、搜索、按修改时间/扫码量排序
- **详情**:大预览 + 当前 target 摘要 + 总扫码数 + 7 天扫码趋势图
- **下载 QR 图片**:PNG / SVG / JPG,支持自定义前/背景色和留白
- **删除**:软删除(30 天内可恢复),期间扫码落地页提示"内容已下线"

### 4.3 Target(目标内容)

每个 QR 始终有且仅有一个**当前 target**。变更时存为新版本,旧版本归档。

#### 4.3.1 Image Target(图片)

- 上传图片(PNG/JPG/WebP/HEIC),单图,≤5MB
- 服务端转码为 WebP(走 Cloudflare Images 或 Worker 端 wasm 转码)
- 落地页:大图居中、白底、tap-to-zoom、底部"长按保存图片"提示
- **特化文案**:落地页可选"打开微信扫一扫识别群码"提示横幅(国际版默认关闭,中文版默认开启)

#### 4.3.2 URL Target(跳转)

- 用户输入目标 URL(校验:必须 http/https、长度限制、黑名单基础过滤)
- 落地页行为可选:**直接 302 重定向** / **中间确认页**(显示目标域名,1 秒后跳转,防钓鱼)
- 默认:外部域名走中间确认页,自家域名直跳

#### 4.3.3 Multilink Target(多链聚合)

- 标题、描述、头像(可选,继承账号头像)
- 链接列表:每条 = label + url + icon(系统图标库 / 上传 logo)
- 排序、增删
- 主题:浅色 / 深色 / 跟随系统(MVP 仅浅色)

### 4.4 扫码落地页(`/q/:slug`)

- 服务端渲染(Worker 直出 HTML)以保证扫码后**最快首屏**
- 关键元素:产品 logo(可在 Pro 移除)、内容主体、"Powered by" 标(同样可移除)
- 移动端优先,desktop 渲染为居中 mobile-frame
- 缓存策略:target 数据缓存于 KV(TTL 60s),变更时失效;静态资源走 CF CDN

### 4.5 扫码分析

- **指标**:总扫码数、UV(基于带签名的临时 cookie 去重)、近 7/30 天趋势、Top 国家、设备类型(mobile/desktop/tablet)
- **数据来源**:Cloudflare 请求自带的 `cf` 对象(country、city、asn、device、browser),无需额外探针
- **隐私**:不存储 IP 原文,仅存衍生维度

### 4.6 历史版本与回滚

- 每次替换 target 自动存版本(target 表 + version 字段)
- 列表展示 N 个版本,可一键回滚(回滚 = 创建一个指向旧 payload 的新版本)

### 4.7 静态 QR 生成器(附属工具)

沿用当前仓库已有的静态 QR 生成器,作为 `/app/tools/static-qr` 附属工具(免费、无追踪),用于一次性需求(不需要更换内容)。

### 4.8 暂未排入(明确 v2+)

- 自定义域名 (`qr.yourbrand.com/<slug>`)
- 团队 / 多人协作
- API & Webhook
- 批量 CSV 导入 / 导出
- 密码保护、阅后即焚、限时窗口
- A/B target、加权 random target
- 内容审核 / 反滥用(MVP 不做,见 §13)

---

## 5. 页面规格

### 5.1 / — 营销首页

**结构**(单页 long-scroll):

1. **Hero**:H1 = "One QR. Forever Yours." / "一个二维码,永远有效。" 副标说明"换内容不换码"。CTA "免费创建 (Google 登录)"。右侧动画:用户在后台改图,印在杯子上的 QR 码扫出来内容跟着变。
2. **痛点场景**:三栏图说三个核心场景(微信群码 / 社群邀请 / 餐厅菜单),每栏一句话痛点 + 解决方案
3. **三种 target 类型** 演示:图片 / 链接 / 多链
4. **特性网格**:实时统计、版本历史、移动优先、全球 CDN、零安装
5. **FAQ**:常见 5 问
6. **底部 CTA + footer**

### 5.2 /q/:slug — 扫码落地页(三种形态)

**Image target**:
- 极简白底 / 全屏大图 / 顶部标题(可选)/ 底部:"长按保存到相册" + (中文版)"打开微信扫一扫"
- 加载中骨架屏
- 失败兜底:友好的"暂时无法加载"页 + 重试

**URL target(直跳模式)**:
- 服务端 302 直接重定向,无前端
- (确认页模式):loader + "你即将前往 <domain>" + "前往" 按钮(3 秒后自动跳)

**Multilink target**:
- 头像 + 标题 + 简介 + 按钮列表(每个按钮:icon + label + 外链箭头)
- 底部 powered-by 链(可移除)

所有形态共享:
- 隐私友好:不嵌入第三方追踪
- 加载性能:HTML <50KB、关键 CSS inline、字体 swap
- 错误页:slug 不存在 / 已删除 / 已暂停,各自的友好文案

### 5.3 /login

- 居中卡片,产品 logo + 一句价值主张 + 一个"Continue with Google"按钮
- 底部:Terms / Privacy 小字

### 5.4 /app — Dashboard

**布局**:左侧 sidebar(MVP 后期改为顶部导航以兼顾移动)+ 右侧主区
- 主区顶部:页面标题 + "+ New QR" 按钮 + 搜索框 + 排序下拉
- 列表:卡片网格(默认)/ 表格 视图切换
- 卡片内容:QR 缩略图、标题、目标类型徽标、总扫码数、最后修改时间、快速操作(编辑 target / 复制 slug / 下载 QR / 更多)

### 5.5 /app/new — 创建向导

3 步(面包屑式 stepper):

1. **Choose target type** — 三张大卡片:Image / URL / Multilink(图标 + 一句话说明 + 示例预览)
2. **Configure** — 按所选类型展示对应表单 + 实时落地页预览
3. **Done** — 显示生成的 QR(SVG 大图)+ 短链 + 下载按钮组(PNG/SVG/JPG)+ "Done" 跳详情

### 5.6 /app/q/:id — QR 详情

**两栏**(desktop)/ **stacked**(mobile):

左栏:
- QR 大图 + 下载按钮组
- 短链 + 复制
- 状态徽标(active / paused / deleted)

右栏 Tab:
- **Target**(默认):当前 target 摘要 + "Edit target"
- **Analytics**:总扫码、7 天趋势 sparkline、国家 Top 5、设备占比环形图
- **History**:版本时间线
- **Settings**:title/description 编辑、暂停 toggle、删除按钮(危险区)

### 5.7 /app/q/:id/target — 编辑 target

按当前 target 类型展示对应表单。允许"切换 target 类型"(切换会建立新版本)。

- Image:拖拽 / 点击上传 + 进度条 + 预览
- URL:输入框 + 域名校验提示 + "直接重定向 / 中间确认页"开关
- Multilink:链接列表编辑器(拖拽排序、行内编辑、添加按钮)

实时右侧 mobile-frame 预览。底部:Cancel / Save。

### 5.8 /app/account

资料(只读)、退出登录、删除账号(二次确认)。

---

## 6. 技术架构

### 6.1 整体拓扑

```
                   ┌──────────────────────────┐
扫码者 / 用户 ──→  │  Cloudflare Edge (300+)  │
                   │  ─ Workers + Static Assets│  (统一入口)
                   └────────────┬─────────────┘
                                │
       ┌────────────────────────┼─────────────────────────┐
       │                        │                         │
   ┌───▼───┐               ┌────▼─────┐             ┌────▼─────┐
   │  D1   │               │    R2    │             │    KV    │
   │ users │               │ images   │             │ target   │
   │ qrs   │               │          │             │ cache    │
   │ targs │               └──────────┘             └──────────┘
   │ scans │
   └───────┘
                        ┌──────────────────┐
                        │ Analytics Engine │  (扫码事件流)
                        └──────────────────┘
```

### 6.2 Cloudflare 组件分工

| 用途 | 组件 |
| --- | --- |
| 前端静态托管 | Workers Static Assets(SPA fallback) |
| API & SSR | Workers + Hono |
| 关系型数据 | **D1**(users / qrs / targets / scan_aggregates) |
| 图片对象存储 | **R2**(`images/<user_id>/<qr_id>/<version>.webp`) |
| 图片转码 / 缩略图 | **Cloudflare Images**(可选;MVP 用客户端 canvas + Worker 端解码) |
| 目标缓存 | **KV**(`target:<slug>` → JSON,TTL 60s) |
| 扫码事件 | **Analytics Engine**(无限写入,SQL 查询) |
| 计数器 | **Durable Object** 单 QR 一对象(高并发原子自增)/ 或 D1 行级 update + 防丢失策略(MVP 用 D1) |
| 全球 DNS / 自定义域名 | CF DNS + Worker custom domain(已绑定 `qrcode-service.tankxu.com`) |
| 机器人防护 | **Turnstile**(MVP 不接入,后续上) |
| 图像审核 | **Workers AI**(MVP 不做,见 §13) |
| 邮件 | (MVP 不做) |

### 6.3 OAuth & Session

延续现状:Google OAuth Code Flow → Worker 用 ID token 拿 userinfo → HMAC-SHA256 签 JWT → HttpOnly Cookie。

Session 拓展:JWT payload 加 `uid`(D1 users.id),Worker 路由首先解 JWT 拿到 uid,所有 `/api/qr/*` 接口按 uid 过滤。

### 6.4 D1 数据模型(MVP 子集)

```sql
CREATE TABLE users (
  id          TEXT PRIMARY KEY,             -- ulid
  google_sub  TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  name        TEXT,
  picture     TEXT,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE qrs (
  id          TEXT PRIMARY KEY,             -- ulid (内部 id)
  slug        TEXT NOT NULL UNIQUE,         -- 公开短串,出现在 /q/:slug
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active',  -- active | paused | deleted
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  deleted_at  INTEGER
);
CREATE INDEX idx_qrs_user ON qrs(user_id);

CREATE TABLE targets (
  id          TEXT PRIMARY KEY,
  qr_id       TEXT NOT NULL REFERENCES qrs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,                -- image | url | multilink
  payload     TEXT NOT NULL,                -- JSON
  is_current  INTEGER NOT NULL DEFAULT 0,
  version     INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_targets_qr ON targets(qr_id, is_current);

CREATE TABLE scan_counters (
  qr_id        TEXT PRIMARY KEY REFERENCES qrs(id) ON DELETE CASCADE,
  total        INTEGER NOT NULL DEFAULT 0,
  last_scan_at INTEGER
);
-- 详细事件存 Analytics Engine,这里只做累计计数。
```

`payload` 形态(JSON,运行时校验):

```ts
type ImagePayload = { r2_key: string; mime: string; width?: number; height?: number };
type UrlPayload = { url: string; mode: "redirect" | "interstitial" };
type MultilinkPayload = {
  title?: string;
  description?: string;
  avatar?: string;          // r2_key 或 URL
  items: { label: string; url: string; icon?: string }[];
};
```

### 6.5 主要 API 设计(REST,前缀 `/api`)

```
POST   /api/auth/google               (已实现)发起
GET    /api/auth/callback             (已实现)
GET    /api/auth/me                   (已实现)
POST   /api/auth/logout               (已实现)

GET    /api/qrs                       列出当前用户的 QR
POST   /api/qrs                       创建 QR { title?, slug?, target }
GET    /api/qrs/:id                   QR 详情(含 current target)
PATCH  /api/qrs/:id                   更新元数据(title/description/status)
DELETE /api/qrs/:id                   删除(软删)

GET    /api/qrs/:id/targets           列出版本
POST   /api/qrs/:id/targets           新建一个版本并设为 current
POST   /api/qrs/:id/targets/:tid/restore  回滚到指定版本

POST   /api/uploads/image             获得 R2 直传签名(避免大图过 Worker)
                                      返回 { upload_url, r2_key }

GET    /api/qrs/:id/analytics?range=7d  聚合分析(从 Analytics Engine 查)

GET    /q/:slug                       公开扫码落地页(SSR,Worker 直出 HTML)
```

### 6.6 落地页性能策略

- Worker 边缘 SSR,避免 SPA hydration 延迟
- target 数据 KV 缓存(60s),变更时主动 `kv.delete`
- 关键 CSS inline、HTML <50KB、图片走 R2 + CF Images 自适应尺寸
- 缓存 header:`Cache-Control: public, max-age=60, stale-while-revalidate=600`(给浏览器和 CF 缓存层)

---

## 7. 设计语言

### 7.1 品牌

- **色彩**:沿用现 UI(Indigo-600 主色 + Slate 中性 + 白底)。语义色:绿(success)、红(danger)、琥珀(warning)
- **字体**:Geist Variable(已加载),body 14-15px,落地页 16-18px
- **图标**:lucide-react(沿用)
- **品牌语气**:克制、专业、有信任感。文案短而具体。

### 7.2 组件库

shadcn/ui + Tailwind v4(沿用)。新增需要的:

- DropZone(图片上传)
- Stepper(创建向导)
- Sortable list(多链编辑)
- StatCard / Sparkline(分析)
- SkeletonImage(落地页骨架)
- MobileFrame(后台预览容器)
- EmptyState(列表为空 / 无数据)

### 7.3 视觉风格

- **圆角**:卡片 `rounded-xl`(12px)、按钮 `rounded-lg`(8px)、缩略图 `rounded-md`
- **阴影**:克制,`shadow-sm` 为主,关键交互 `shadow-md`
- **间距**:8px 网格
- **动效**:Framer Motion(已用),只用于反馈类微交互(hover、加载、成功 toast),禁止装饰性大动画影响首屏

### 7.4 落地页设计原则(独立于后台)

- **极简**:扫码者最关心的就是"我要的内容在哪",其他全去掉
- **大触控目标**:按钮高度 ≥48px,行高足够
- **暗色支持**:multilink 落地页支持 dark mode(MVP 后)
- **字体加载**:fallback 到系统字体,Geist 异步加载防 FOIT

---

## 8. 响应式与移动端

### 8.1 断点

沿用 Tailwind 默认:`sm 640 / md 768 / lg 1024 / xl 1280`。

### 8.2 三类页面策略

| 页面类 | 主屏 | 移动适配方案 |
| --- | --- | --- |
| **扫码落地页** `/q/:slug` | **mobile-first** | desktop 渲染为居中 420px 卡片,周围空间淡灰 |
| **应用后台** `/app/*` | desktop-first | 移动端:sidebar → 抽屉、表格 → 卡片堆叠、双栏 → tab |
| **营销页 / 法务页** | 流式 | 各断点重排 |

### 8.3 触控

- Hover 效果不可作为唯一信息(移动端无 hover)
- 列表项整张可点击(不只在标题文本上)
- 表单按钮组在移动端粘底,避免键盘弹起遮挡

---

## 9. i18n 与本地化

- 库:`react-i18next`(轻量,无运行时依赖外部服务)
- 起步语言:**en**(默认)、**zh-CN**
- 检测:首访按 `Accept-Language`,用户登录后存 `users.locale` 字段
- 落地页 SSR 时按 cookie / `Accept-Language` 选择语言
- 设计:文案统一在 `locales/{en,zh-CN}.json`,代码里只用 key
- **本地化适配**:中文版默认开启"打开微信扫一扫"提示;英文版默认关闭

---

## 10. 非功能需求

### 10.1 性能目标

| 指标 | 目标 |
| --- | --- |
| 落地页 TTFB(p75 全球) | < 200ms |
| 落地页 LCP(p75) | < 1.5s |
| Dashboard 首屏(已登录,p75) | < 2.0s |
| API p95 延迟 | < 300ms |

### 10.2 可用性

- Workers 多区域天然高可用
- D1 当前为单主,容忍读延迟,关键写路径加重试
- R2 上传失败后客户端可断点重传(MVP 简化为整体重传)

### 10.3 安全

- 所有 cookie:`HttpOnly; Secure; SameSite=Lax; Path=/`
- CSRF:登录会话外接口要求 same-origin(SameSite=Lax 已防大部分);敏感 mutate 接口加 `Origin` 校验
- XSS:SSR 落地页所有用户输入走 HTML escape;multilink 仅允许 http/https 链接
- URL 校验:不允许 `javascript:`、`data:`、私有 IP、localhost
- 文件上传:校验 magic number(不仅看后缀);限制 mime;尺寸上限
- 速率限制:KV-based,login 5/min,创建 QR 60/min,上传 30/min(per IP + per uid)

### 10.4 隐私

- 不存储扫码者 IP 原文,只存衍生(country / device 类型)
- 数据导出:`/app/account` 提供 JSON 导出(MVP 后)
- 删除账号 = 永久删除所有相关数据(R2 对象、D1 行)
- 隐私政策页面明确陈述上述

### 10.5 可访问性

- 目标 WCAG 2.1 AA
- 语义化 HTML、aria-label、focus ring
- 颜色对比度满足 AA
- 表单错误信息与 input 关联

### 10.6 SEO(营销页 + 帮助文档)

- SSR meta、OpenGraph、Twitter Card
- sitemap.xml + robots.txt
- 多语言 hreflang

### 10.7 监控与可观测

- Workers Logs(已默认)
- 关键事件埋点到 Analytics Engine:`oauth_login_succ/fail`、`qr_create`、`target_change`、`scan`
- 错误上报:接 Sentry(SaaS,例外允许)或 CF 自带 Logpush

---

## 11. 路线图(高粒度)

| 阶段 | 时间 | 内容 |
| --- | --- | --- |
| **MVP** | 第 1 个月 | 详见 [MVP.md](./MVP.md) |
| **v1.0 公测** | 第 2 个月 | 国际化双语、营销首页、帮助文档、GA 化 |
| **v1.1** | +1 月 | 扫码分析升级(地理热力图、时间分布)、历史回滚 UI、自定义 QR 样式(色彩/Logo 嵌入) |
| **v1.2** | +1 月 | 反滥用三件套(Turnstile、Workers AI 图像审核、举报通道) |
| **v1.3** | +1 月 | 邮件接入(Resend 例外)、密码保护 QR、阅后即焚 |
| **v1.4** | +2 月 | 自定义域名、API & Webhook、批量管理 |
| **v2.0** | +3 月 | 团队 / 多人协作、A/B target、付费上线 |

---

## 12. 开放问题 / TBD

- 产品最终命名
- 营销页域名(继续 `qrcode-service.tankxu.com` / 或独立域名)
- 自定义 slug 是否对所有用户开放(MVP 默认系统生成,自定义在 v1.1 开放)
- 删除账号的"宽限期"长度(默认 30 天)
- 扫码 UV 去重精度(MVP 用 cookie,v1.x 考虑指纹)

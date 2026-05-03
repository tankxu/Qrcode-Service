# 内容到期倒计时提醒 — 产品功能文档

> **状态**: Draft v0.1 · **拟上线版本**: v0.5 · **作者**: Tank
>
> 关联文档: [`PRD.md`](./PRD.md) §2.2 用户旅程, §6.4 数据模型 · [`MVP.md`](./MVP.md)

---

## 1. 背景

### 1.1 核心场景:微信群二维码 7 天失效

PandaQR 的核心价值是"**永久 QR 不变,内容随时换**"。但用户的痛点不只是"换",还有"**忘了换**":

- 用户把入群海报印好、贴到地推物料、发到公众号文章里
- 微信群二维码本身只有 **7 天有效期**
- 用户需要在第 7 天来临前重新生成群码、再上传到 PandaQR 替换图片
- **如果忘了**,这 7 天里物料就失效;就算有 fallback note,体验仍然是"用户扫了码却看到一张过期的图"

类似场景还有 Telegram 邀请链接、限时活动报名页、限时优惠码等。**都需要一个"到期前提醒我"**。

### 1.2 为什么不直接做"自动续期"

技术上无法绕过:微信不开放群码 API,任何"自动刷新"都需要用户手动到微信里截图重传。所以产品定位是 —— **降低用户失忆成本,而不是替用户操作**。

> 提醒,不是兜底。让用户在咖啡都没凉之前打开 App 换个图。

---

## 2. 用户场景

| 角色 | 场景 | 期望体验 |
| --- | --- | --- |
| 社群运营者 | 印了 200 张地推卡,用 PandaQR 永久码指向最新群码 | 到第 6 天收到邮件:"明天群码就要失效,记得换图" |
| 商家 | 限时优惠活动,落地页只在活动期内有效 | 创建时设"活动结束日 6/30",提前 1 天提醒下架/换内容 |
| 创作者 | Telegram 邀请链接半个月轮换一次 | 设 14 天倒计时,循环提醒 |
| 普通用户 | 不需要倒计时 | 入口默认折叠,不打扰 |

---

## 3. 功能范围

### 3.1 In Scope (v1)

- 创建/编辑 QR 时,在"**高级选项**"中可启用倒计时
- 预设模板:**微信群 (7天)** / 30 天 / 自定义天数
- 提前提醒间隔:24h / 3 天 / 7 天前 (多选)
- 提醒通道:**邮件** + **站内通知** (Dashboard 角标 + 详情页头条)
- 用户更换 target 内容(上传新图、改 URL)时,**自动重置倒计时**
- 到期后行为:不删除内容,公开页 fallback 文案自动加挂"此内容可能已过期"提示
- 暂停 (paused) 状态的 QR 不发提醒
- Dashboard 列表展示倒计时状态徽标 (绿/橙/红)

### 3.2 Out of Scope (v1)

- 短信、Webhook、IM (微信/Telegram bot) 提醒
- 自动生成新群码/抓取最新邀请链接 (无解,微信不开放)
- 团队协作维度的提醒 (例如代理人提醒)
- 提醒的多语言邮件模板 (v1 只做 EN + zh-CN)

---

## 4. 信息架构 & UI

### 4.1 入口位置

**创建向导 (NewQrWizard.tsx) Step 2** 与 **详情页 SettingsTab (QrDetail.tsx)**,二者复用同一个表单组件:

```
┌─ Target 表单 ─────────────────────┐
│ [图片上传 / URL 输入 / 多链]        │
└──────────────────────────────────┘

▾ 高级选项                           <- 默认折叠
   ┌──────────────────────────────┐
   │ ☐ 设置内容到期倒计时           │
   │                              │
   │ (展开后)                      │
   │ 模板: ● 微信群 (7天)           │
   │       ○ 30 天                │
   │       ○ 自定义 [__] 天        │
   │                              │
   │ 提前提醒: ☑ 24小时 ☐ 3天 ☐ 7天│
   │                              │
   │ 到期后: ● 仍然展示内容         │
   │         ○ 自动暂停 QR         │
   └──────────────────────────────┘
```

### 4.2 智能默认 (轻引导)

当 `target.type === 'image'`,且 `title` / `note` 命中关键词正则
`/(微信|wechat|群码?|入群|加群|group)/i` 时:

- 自动展开高级选项
- 默认勾选"微信群 (7天)"
- 弹气泡:"看起来你在做微信群入口,默认开启 7 天倒计时提醒。可关闭。"

不强制,用户随时关掉。**预期收益:90% 微信群场景零额外操作就拿到提醒。**

### 4.3 状态可视化

#### Dashboard 列表 (`Dashboard.tsx` 卡片)

QR 卡片右上角加一个倒计时徽标:

| 剩余时间 | 颜色 | 文案 |
| --- | --- | --- |
| > 48h | `slate-400` | `5d left` (灰,低存在感) |
| 24-48h | `amber-500` | `1d left` |
| < 24h | `red-500` | `8h left` (红,带轻脉冲动画) |
| 已到期 | `red-600` 描边 | `Expired · refresh` |
| 未启用 | 不展示 | — |

#### 详情页 (`QrDetail.tsx`)

倒计时启用且剩余 ≤ 7 天时,在面包屑下方插入一条横幅:

```
⚠ 这个二维码的内容将在 6h 后过期 · 上次刷新于 6 天前
[立即换图]  [延后 7 天]  [关闭提醒]
```

#### 公开扫码落地页 (`worker/views/Image.tsx` 等)

到期后(且用户选了"仍然展示内容"):

- 仍然渲染原图,**但** `note` 字段下方自动加一条灰色补充行:
  > _此入口可能已过期,请联系发起方获取最新二维码。_
- 不强行替换,保持视觉连续性

---

## 5. 提醒触发与通道

### 5.1 触发机制

Cloudflare Workers **Cron Trigger**,每小时跑一次:

```
每小时 :05 →  扫描 expiry_reminders 表,拣 due_at <= now() 且未发送的记录
              →  按 user_id 聚合 (避免一次发太多)
              →  写入站内通知队列 + 调用邮件 ESP
              →  标记已发送
```

### 5.2 邮件模板 (v1 EN)

主题: `Your QR "<title>" expires in <X> hours`

正文核心字段:
- QR 标题 / slug / 落地页 URL (扫码后跳哪)
- 距离到期还剩多久 (人类可读: "in 23 hours" / "tomorrow at 3 PM")
- 本次内容上次刷新时间
- 一键 CTA: **"Open detail page"** → 直达 `/qr/<id>` Settings tab
- 附行: "Don't want these? Mute reminders for this QR / All QRs"

> ⚠ 当前后端未接入邮件 ESP (PRD §6.2 Email = MVP 不做)。
> v0.5 上线前需先选定:**Resend / Cloudflare MailChannels / AWS SES**。
> 推荐 Resend (DX 最好,有 React Email 模板),备选 MailChannels (CF Worker 免费内嵌)。

### 5.3 站内通知

- Dashboard 顶部右上角铃铛图标 (新组件 `<NotificationBell/>`)
- 未读小红点
- 点开抽屉显示最近 20 条提醒,每条点击直达对应 QR
- 单条提醒可"已读"/"忽略"

---

## 6. 数据模型变更

### 6.1 新增字段 (`qrs` 表)

```sql
-- migration: 0004_expiry_reminder.sql
ALTER TABLE qrs ADD COLUMN expiry_enabled INTEGER NOT NULL DEFAULT 0;  -- 0/1
ALTER TABLE qrs ADD COLUMN expiry_window_seconds INTEGER;              -- e.g. 604800 = 7d
ALTER TABLE qrs ADD COLUMN expiry_anchor_at INTEGER;                   -- target 上次刷新时间 (unix sec)
ALTER TABLE qrs ADD COLUMN expiry_lead_times TEXT;                     -- JSON: [86400, 259200] 提前几秒提醒
ALTER TABLE qrs ADD COLUMN expiry_action TEXT NOT NULL DEFAULT 'keep'; -- keep | pause
```

**关键:** `expiry_anchor_at` 在每次 `target_payload` 被修改时同步更新,这样"换了图"就等于"重置倒计时"。在 `routes/qrs.ts` 的 update handler 里加 trigger。

### 6.2 新增表

```sql
CREATE TABLE expiry_reminders (
  id          TEXT PRIMARY KEY,
  qr_id       TEXT NOT NULL REFERENCES qrs(id) ON DELETE CASCADE,
  due_at      INTEGER NOT NULL,        -- 这条提醒应该被发送的时刻 (unix sec)
  kind        TEXT NOT NULL,           -- lead_24h | lead_3d | lead_7d | expired
  sent_at     INTEGER,                 -- null = 未发送
  channel     TEXT NOT NULL,           -- email | inapp | both
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_expiry_due ON expiry_reminders(due_at) WHERE sent_at IS NULL;

CREATE TABLE notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qr_id       TEXT REFERENCES qrs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,           -- expiry_lead | expired | system
  title       TEXT NOT NULL,
  body        TEXT,
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_notif_user ON notifications(user_id, created_at DESC);
```

### 6.3 用户级偏好 (后续 v2)

`users.notification_prefs JSON` 存"全局静音"、"邮件偏好"、"时区"。v1 复用 `users.email`,默认所有提醒都发到该邮箱。

---

## 7. 行为细节与边界

| # | 场景 | 行为 |
| --- | --- | --- |
| 1 | 用户在 7 天里换了 3 次图 | 每次更新 `expiry_anchor_at`,重新规划 reminders;旧的未发送提醒标记 cancelled |
| 2 | QR 被 pause | 暂停期间不发提醒;resume 后按 `expiry_anchor_at + window` 重算 |
| 3 | QR 被 delete | 级联删除 reminders / notifications |
| 4 | 用户跨时区 | 存 UTC,UI 按浏览器 `Intl.DateTimeFormat` 渲染本地时间;邮件文案用相对时间 ("in 23 hours") 避开时区歧义 |
| 5 | 邮件发送失败 | 重试 3 次 (5min/30min/2h),仍失败则只保留站内通知,日志告警 |
| 6 | 用户把 7 天改成 30 天 | 重算 `due_at`,旧 reminders cancelled,新 reminders 入队 |
| 7 | 已到期但用户选 "keep" | 公开页继续展示原内容 + 灰色提示行;Dashboard 红色徽标常驻直到换图 |
| 8 | 已到期且用户选 "pause" | `qrs.status = 'paused'`,公开页改走 paused 模板 (现有的) |
| 9 | 用户点了邮件里的 "Mute" | `notifications.muted` 加白名单 (按 qr_id);Dashboard 仍显示徽标但不再发邮件 |

---

## 8. 上线分阶段

### Phase A — 数据 & 站内通知 (1 周)
- migration 0004
- 创建/编辑表单加高级选项
- Cron + reminder 调度逻辑
- Dashboard / 详情页徽标 & 横幅
- 站内 NotificationBell

**验收:** 创建一个"7 天"的 QR,改系统时间到第 6 天,Dashboard 出现红色徽标。

### Phase B — 邮件通道 (1-2 周)
- 选定 ESP & 接入
- React Email 模板 (EN + zh-CN)
- "Mute" 链接 token
- 失败重试 / 退订页

**验收:** 同上场景,QR 关联邮箱收到带 CTA 的邮件。

### Phase C — 智能默认 & 优化 (3-5 天)
- 关键词检测 + 自动展开
- 文案打磨
- 数据埋点 (启用率 / 点击 CTA / 实际换图比例)

---

## 9. 衡量指标

| 指标 | 目标 |
| --- | --- |
| 倒计时启用率 (新建图片型 QR) | > 40% |
| 提醒点击 → 真实换内容转化率 | > 60% |
| "失忆"率 (到期后 24h 内仍未换) | < 20% |
| 邮件投递成功率 | > 98% |
| 用户主动关闭/静音率 | < 15% (高于此说明打扰过头) |

---

## 10. 待决问题

1. **ESP 选型:** Resend vs MailChannels vs SES — 需要看价格/送达率/CN 邮箱(QQ/163)送达情况
2. **是否 v1 就做 zh-CN 邮件模板**,还是先英文 + 一行中文摘要
3. **"延后 7 天"按钮是否应该提供** (用户可能赖账无限延期,反而失效)
4. **暂停的 QR 是否在到期当天发一条"已暂停且已到期"的总结邮件**,避免用户根本不知道已经过期
5. **同一个用户 N 个 QR 同时到期:** 合并成一封邮件,还是各发各的 (合并 → 体验好但实现复杂)

---

## 11. 与现有代码对接点

- 表单组件: 新增 `src/components/app/ExpiryAdvanced.tsx`,被 `NewQrWizard.tsx` Step 2 与 `QrDetail.tsx` SettingsTab 共用
- API: `qrsApi.create` / `qrsApi.update` 入参扩展 `expiry?: { window, leadTimes, action }`
- Worker 路由: `worker/routes/qrs.ts` update 时同步重算 reminders
- Cron: `worker/index.ts` 加 `scheduled` handler,`wrangler.toml` 配 `[triggers] crons = ["5 * * * *"]`
- 邮件: 新模块 `worker/lib/mail.ts`,封装 ESP 调用 + 模板
- i18n: 新增 `expiry.*` 命名空间,所有 7 个 locale 文件同步

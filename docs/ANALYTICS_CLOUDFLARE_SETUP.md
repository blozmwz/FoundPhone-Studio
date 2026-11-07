# 完整版 R41：匿名统计配置（尚未上线）

目标沿用 Cloudflare Pages 项目 **bdg**，生产域名 **bdg-bp3.pages.dev**。GitHub 生产分支仍是 blozmwz/FoundPhone-Studio 的 main。不要新建游戏域名、删除旧项目、清除网站数据或先推 main。本页中的服务端设置完成后，才部署已冻结的完整版。

## 1. 建立一个空 D1 数据库

Cloudflare 控制台 → 存储与数据库 / Storage & databases → D1 → 创建数据库，建议名称 `thursday-stats`。选择当前免费方案即可；不要为本项目自动升级付费。

打开数据库 → Console，在这份新数据库中运行项目文件 [schema.sql](../server/analytics/schema.sql) 的完整 SQL。它只创建匿名统计表和索引，不读取／修改玩家的浏览器存档。

回到 Workers & Pages → **bdg** → Settings → Bindings → Add → D1 database：

- Variable name：`ANALYTICS_DB`
- Database：刚才建立的 `thursday-stats`
- 环境选择 Production；不要让预览环境共用生产统计库。

绑定保存后在下一次部署生效。若旧控制台把 Bindings 放在 Functions 下，选择同名 D1 绑定即可。

## 2. 只保护管理路径的 Access 登录

Cloudflare One / Zero Trust → 创建团队（如果尚无团队），免费方案即可。启用 Email one-time PIN（邮箱一次性验证码）或你已有的可信身份提供方。

Access → Applications → 添加 Self-hosted 应用，名字 `Thursday author statistics`。**只保护以下两项**：

- 主机名 `bdg-bp3.pages.dev`，Path `admin`
- 主机名 `bdg-bp3.pages.dev`，Path `admin/*`

登录策略仅 Allow → Emails → **你自己的完整邮箱**，不填 Everyone、不使用 Bypass；保留未命中默认拒绝。建议会话时长 8 小时。

如果 `pages.dev` 无法直接选择：bdg → Settings → Enable access policy 创建 Pages 预览应用 → Manage → 修改此应用的 public hostname，去掉预览通配符，改成上面的生产主机，**同时立即限定 admin 与 admin/* 路径**。不要创建全站生产域名保护；根路径 `/` 必须继续免登录给玩家。具体控制台版本请对照 [Cloudflare 官方 pages.dev Access 步骤](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain)。控制台自动生成的预览应用与生产路径应用不要混淆。

记下本应用的 **Application Audience (AUD)** 和团队域名（形如 `https://你的团队.cloudflareaccess.com`）。它们由你填入服务端配置，不发到聊天，不写进网页或 GitHub。

## 3. Pages 服务端变量

bdg → Settings → Variables and Secrets → Production，设置：

| 名称 | 值 |
|---|---|
| `ANALYTICS_ENABLED` | `1` |
| `ANALYTICS_ORIGIN` | `https://bdg-bp3.pages.dev`（无结尾斜杠） |
| `CF_ACCESS_ISSUER` | `https://你的团队.cloudflareaccess.com`（无结尾斜杠） |
| `CF_ACCESS_AUD` | 上一步本应用的 Audience 值 |
| `ANALYTICS_OWNER_EMAIL` | Access 策略允许的你的完整邮箱 |

作者邮箱和认证参数建议使用 Secret 类型；**不得以 VITE_ 开头**，不能放进构建时前端变量。绑定 `ANALYTICS_DB` 不是普通文本变量。

配置完只需告诉我“D1、Access及Production变量已配置”，无需发送任何密钥。正式部署仍由当前任务的授权执行，不需要再次授权。

## 4. 上线后怎样查看

游戏仍是 https://bdg-bp3.pages.dev/，无需登录。

管理页是 https://bdg-bp3.pages.dev/admin/：使用你允许的邮箱登录并输入 Cloudflare 邮件验证码，之后查看匿名汇总。别的账号不能进入。退出用管理页的“退出登录”。后台除了 Access 网关，还自行验证 JWT 的签名、签发方、有效期、Audience 和作者邮箱；不能靠伪造请求头或只知道路径进入。未配置或数据库故障时，统计关闭，不影响游戏、保存或音乐。

发布后必须检查：未登录访问 admin 被要求登录、非作者被拒绝、作者成功登录；根页面继续公开；config enabled=true；真实游戏活动可在后台增加记录。当前仅本地验证，不能提前把这些写成已完成的线上结果。

## 统计口径与限制

- 随机浏览器标识，无指纹；上传白名单仅随机访客／会话／周目标识、固定章节／结局类别、版本、前台活动时间桶。不上传姓名、草稿、私聊、完整存档、账号、URL参数、IP或User-Agent字段。Cloudflare 的自身访问日志由其平台政策决定，不是应用统计表。
- 每次打开页面计一次访问，刷新可增加访问量；访客数按浏览器匿名标识去重。回访为在更早日期已出现过采集记录的访客。换设备、清除浏览器数据会分开计算；DNT/GPC、拦截插件、断网可能少计。日期时区固定 Australia/Melbourne。
- 新玩家完成命名并进入手机计开始。旧档首次接入统计只记接续及当前章，不倒造过去的到达、完成或结局。原进度与独立重玩分开。达成人数与独立周目次数分别显示；同一周目结局事件去重，刷新不重复通关。
- 章节表分别列到达人数、到达周目、完成周目；完成率按同一批到达周目的后续完成计算。最后停留章为该访客最后一次观察到的章节，不代表确定流失。
- 最近 3 分钟仍成功上报有效前台活动的浏览器去重人数叫“估算在线”。有效时间只计可见前台且最近 60 秒有点击、触摸、键盘或滚动；后台、挂机不持续计入。每 30 秒左右批量上报，关闭时尽力发送，失败有有界重试队列。多标签同一分钟取最大值并封顶 60 秒，可能少计，不夸成精确人数。
- 统计从配置并部署后的采集时刻开始。没有历史补造。数据库当前保留已采集记录，后台可看近 7/30/90/180 天，尚无自动清理或导出后台数据功能；可在 Cloudflare D1 导出备份。配额接近上限时先停采集或整理统计库，不操作玩家存档。
- 公共匿名上报不能阻止所有伪造访客。限制来源、字段、大小、时间桶、去重和数量，仍应视为体验指标估算，不是反作弊或付费结算数据。

## 费用

本方案使用 Pages Functions + D1 + 仅作者一个用户的 Access，不需要购买域名。Cloudflare 当前免费额度包含 Functions/Workers 每日共 100,000 请求；D1 每日 500 万行读取、10 万行写入、合计 5GB；Access 免费方案可容纳 50 用户。普通游戏静态资源不进入统计 Worker 路由，不消耗 Functions 调用。索引写入也计数据库用量。

额度是整个账号共享，不能据此承诺永远免费。保持免费方案时超额会拒绝统计请求，游戏静态资源及本地存档仍能使用；若你已有付费 Workers 方案，超过包含额度可能按量收费，请在账号 Billing/Usage 核对。当前未开通任何付费服务。

官方资料：[Functions 计费](https://developers.cloudflare.com/pages/functions/pricing/)、[D1 计费](https://developers.cloudflare.com/d1/platform/pricing/)、[Cloudflare 免费计划](https://www.cloudflare.com/plans/)、[D1 绑定](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases)。

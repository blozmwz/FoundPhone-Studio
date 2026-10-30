# 礼拜四公开版交接 · 1502

公开范围为 Stage 1＋Stage 2，起于 2026/9/17，止于 11/20。仅含已审阅的公开数据；完整作者稿在作者本地工作目录另行保留。不得使用后续作者稿直接覆盖公开 story.json。

用户已确认更新到 https://bdg-bp3.pages.dev/，Cloudflare Pages 项目 bdg，main 推送后自动构建。部署关联设置由用户确认；未声称通过登录控制台独立读取。发布前须检查 remotes、工作树、授权素材与范围。

## 当前行为

- 开场设置名字、0917 解锁。模拟键盘双选，先草稿后发送。是否入住由玩家发送；拒绝结局和重选保留。
- 入住后 IG 才可查看。常驻澳门双图「返嚟啦」及纽约单图「NYC 隨便逛逛」，不置顶。iMessage 狗头像不换。公开素材明细见 IG_STAGE_1_2_RELEASE_ASSETS.md。
- Uber Eats 原图图标，11 项具体食物、描述和价格，无真实支付；后续阶段互动没有包含在此版。
- 最后消息读完仅 releaseComplete=true，不弹正式结局。继续下一日期才显示一次「目前已更新至这里，等待后续更新。」
- Threads 普通推荐池按游戏日期轮换，固定 ID、互动和时间；匿名日常新帖按实际事件解锁、保存首次解锁时间。网友不知道私聊与身份。
- 以统一已读位置计算消息角标、会话圆点及提醒；未来新消息不提前清除。

## 存档与升级

IndexedDB 数据库 foundphone-studio 的 saves 表，常规槽 fridge-light-roommates，localStorage 有短期即时写入日志和名字。有效消息、选择、日期、草稿及互动自动保存。读取后补缺字段；未知版本不覆盖原档。

1501→1502 专用迁移保留原选择、阅读和 UI，移除旧入住试玩结束标记，接合同和搬家；拒绝保留结局。导出 JSON 可跨设备导入，先验证作品、版本和结构，再确认覆盖。测试使用上一版公开引擎数据和独立浏览器上下文，不使用玩家私人存档。

work.json 使用网络优先并支持离线回退；实际 Service Worker 升级刷新本游戏作用域窗口，不清数据库。不同域名不能自动共享存档。

## 开发与验证

复用现有引擎、App 和许可，不整体重写手机。story.json 中 releaseStage2 标记使标准 npm run build 只生成当前作品，不生成空白/测试作品。测试夹具为上一版已公开数据，仅供源码回归，不打包到 dist。

运行 typecheck、lint、test、story:validate、story:test、build。四条路线为两种拒绝与两种 Stage2 非结局停点；所有主要互动需保持两个有效选项。后台 Chrome 覆盖名字、PIN、回复/草稿刷新、旧存档接续、拒绝重选、备份导入导出、缓存升级、已读与菜单；未验证实体 iPhone/Safari，不应声称全设备兼容或穷举所有选择组合。

## Stage1-2 maintenance release

The user approved publishing the local ordering/layout fixes and one November20 B wording change to the existing Cloudflare domain. Preserve revision1502 saves, stable choice IDs and unsent drafts. Restore current choice labels without sending them.

Desktop layout revision3 updates only the newly available delivery/netflix settings. Optional conversations cannot precede already delivered messages; old timestamps are corrected without re-sending. Unread receipts use actual story dates. Date advancement waits for replies and scheduled messages.

Delivery UI and event dispatch share canOrderFood: housingRoute=stay, completed Hendery rental confirmation, moved-in stage, and no current choices/scheduled messages/active side conversation. Existing at-home knowledge and once-only stage events remain. Stage2 soft stop supports existing food interactions; Stage3-5 data remain excluded.

Validate actual deployed assets and independent Chrome saves rather than just the unchanged data revision. No blanket reset or personal-browser access.

# 日常有序 · Daily in Order

把目标安排进日常，把每一段投入记录下来。

**简体中文** · [English](README.en.md)

[在线使用](https://personal-daily-organize.web.app/) · [功能与使用](#功能与使用) · [本地运行](#本地运行) · [部署自己的版本](#部署自己的版本)

日常有序是一个支持中文、英语和德语的个人工作台：在同一个地方安排任务、记录专注、查看项目进度，也可以按需开启学习、阅读、作息、健身和财务模块。采用绿色主色、卡片式布局，适配电脑与手机。

本仓库包含应用源码、测试和部署脚本，不包含作者或其他用户的工作台记录、备份、账号凭证或生产环境配置。在线服务需要注册自己的账号；自行部署时请使用自己的 Firebase 项目。

## 界面预览

以下六张截图直接展示，无需展开。全部来自空白登录页或本地虚构测试账号，不含真实用户记录。[截图说明](docs/images/README.md)

### 快速开始（v0.7.0 预览）

先写下想做的事，再检查可编辑草稿。无需先建立项目或设置目标。

![Quick start with synthetic local task input](docs/images/quick-start-zh.jpg)

### 今日概览

待办清单、项目进度和今日随记。本组演示关闭了可选生活模块，突出日程与项目。

![今日概览测试界面：六项示例任务、项目进度与虚构随记](docs/images/today-demo-zh.jpg)

### 当日时间轴

连续的实际投入记录与后续安排，在同一条时间轴中显示。

![时间轴测试界面：九点开始的连续投入与后续阅读安排](docs/images/timeline-demo-zh.jpg)

### 沉浸专注

当前任务、倒计时与实时增长的虚拟激励。

![专注计时测试界面：当前任务、剩余时间、虚拟成长值与暂停结束操作](docs/images/focus-demo-zh.jpg)

### 登录界面

![日常有序中文登录界面，绿色配色与独立账号入口](docs/images/sign-in-zh.jpg)

### 每日摄入

营养数字仅用于界面演示，不是饮食建议。

![每日摄入界面：热量、蛋白质、运动消耗与分餐记录](docs/images/nutrition-demo-zh.jpg)

## 功能与使用

| 模块 | 可以做什么 |
| --- | --- |
| 今日与日历 | 在列表和时间轴之间切换，拖动调整时间；没有固定开始时间的事项也能保存 |
| 项目与任务池 | 创建项目、拆分任务、设置重复安排，查看任务及项目进度 |
| 专注与投入记录 | 正向计时或倒计时，记录实际开始和结束；分段累积投入，修改或删除单段记录后重新计算统计 |
| 学习与阅读 | 自定义学习方向、练习和目标；查看投入进度，记录书籍页数、阅读时长及起止日期 |
| 作息、运动与摄入 | 习惯打卡、睡眠和训练记录；可选每餐热量、蛋白质及运动消耗记录 |
| 财务与预算 | 自定义账户和预算；不同币种分别统计，不自动换算汇率 |
| 数据复盘与备份 | 查看投入趋势；完整 JSON 备份与恢复、任务 CSV、日历 ICS 导入导出 |
| 新手引导与反馈 | 选择需要的模块、设置目标、逐步学习操作；提交反馈并查看处理情况 |

**预览版 v0.7.0：先写清单 → 检查草稿 → 开始行动**。新账号先看到快速开始；现有账号从「快速添加」进入。每行一个事项，支持粘贴、勾选、修改日期与小时/分钟，再一次加入。开始时间和日期均可留空；不设置日期的事项进入任务池。保存后可撤销本批次；若已经修改或开始专注，会阻止整批撤销以保护进展。模块、目标和项目可稍后设置。

可选「AI 帮我整理」通过 Firebase AI Logic / Gemini Developer API 把自然语言整理成可编辑草稿，也可继续描述修改。只有同意后才发送本次输入和选中草稿，不自动读取原有工作台记录；AI 不直接保存，不生成实际投入。重复规则第一版不自动创建，需自行核对草稿。清单录入可离线，AI 需要联网。该功能先在预览验收，在线正式版以已发布版本为准。

云端 AI 还需要 Google App Check 验证通过。若浏览器出现验证失败（例如 403），输入会保留，可改用普通清单；应用不会跳过验证，也不会自动改用收费接口。

AI 试用设有**本设备每账号每天 10 次尝试（UTC）**的浏览器计数，包括失败请求；这不是服务端账号配额，也不是防滥用或费用上限，清空存储/换设备会重置。服务商免费配额另有限制。零付费试用依赖 Firebase **Spark、未关联 Cloud Billing**；额度耗尽时停止调用，不自动升级。

自行启用：按 [Firebase AI Logic 文档](https://firebase.google.com/docs/ai-logic/get-started?platform=web) 配置 Gemini Developer API 和 App Check，在 `.env.local` 填写 `.env.example` 中的三个 AI 配置项。App Check 站点密钥仅允许自己的预览域名；正式发布前另行审阅正式域名配置。不要放入 Gemini 密钥，不要为本功能启用 Cloud Functions 或绑定结算账户。App Check 策略为项目级，勿未经审核改变正式环境的校验策略。查看 [免费方案条件](https://firebase.google.com/docs/ai-logic/pricing) 和 [Google AI 数据使用条款](https://ai.google.dev/gemini-api/terms)。本地模拟器始终关闭真实 AI 请求，测试只使用虚构返回。

语言可在界面切换，也可通过 `?lang=zh`、`?lang=en`、`?lang=de` 指定。用户自己填写的任务、笔记和书名不会被自动翻译；CSV 目前使用中文列名。

专注中的“潜在财富”是随时间增加的虚拟激励数值，不代表真实收入。营养目标是参考估算，支持用户调整，不用于医疗诊断或治疗。

## 技术栈

React 19 · TypeScript · Vite · Firebase Authentication · Cloud Firestore · Firebase Hosting · IndexedDB · Service Worker

业务逻辑集中在 `lib/`，界面在 `app/`，数据通过账号专属的本地操作队列与云端同步。Firestore 规则要求已验证邮箱，并按 UID 限制工作台读写。

## 本地运行

需要 **Node.js 24.12+、npm、Java 21+**。Java 用于 Firebase 模拟器。首次安装依赖和下载模拟器需要联网。

```bash
git clone https://github.com/Kylie08ky/daily-in-order.git
cd daily-in-order
npm ci
```

终端一，启动本地账号与数据库模拟器：

```bash
npm run emulators
```

终端二，启动网页：

```bash
npm run dev
```

打开 <http://127.0.0.1:52700>。开发模式默认连接本地模拟器，不需要真实 Firebase 项目。模拟器使用 `demo-friends-isolation` 项目标识；注册后，验证邮件链接会出现在模拟器终端中，不会发送真实邮件。

模拟器数据默认不会在重启后保留，重要测试记录请先从应用导出备份。

## 部署自己的版本

1. 创建自己的 Firebase 项目和 Web 应用，启用 Authentication 的**电子邮件地址 / 密码**登录方式，并创建 Firestore 数据库。
2. 复制 `.env.example` 为 `.env.local`，填入该 Web 应用的 Firebase 配置。复制 `.firebaserc.example` 为 `.firebaserc`，将 `projects.default` 改为相同的项目 ID。这两个实际配置文件已被 Git 忽略。
3. 在 Authentication 的授权域名中检查你的正式站点与预览站点域名。注册后需要完成邮箱验证才能访问个人云端数据。
4. 登录 Firebase CLI，运行检查，再部署预览。

```bash
npx firebase login
npm test
npm run test:rules
npm run build
npm run deploy:preview
```

环境变量中的 `VITE_` 配置会包含在浏览器代码中，只能填写公开的 Web 客户端配置。**不要填写服务账号私钥、管理员令牌或其他服务端凭证。** 访问控制依赖 Authentication 和 Firestore 规则，而不是隐藏 Web API key。

`npm run deploy:preview` 会构建应用、部署 Firestore 规则和索引，并创建 / 更新有效期 30 天的 `workbench-review` Hosting 预览频道。**数据库规则和索引是项目级设置，修改它们也会影响正式环境。** 有效期到期后可重新部署预览。

确认预览后，将同一份已检查的构建发布到正式站点：

```bash
npm run release:friends -- --confirm-reviewed-preview
```

该命令只提升 Hosting 版本，不重新构建，也不复制工作台数据。脚本要求 `.env.local` 中的项目 ID 与 `.firebaserc` 一致；默认使用项目同名的 Hosting 站点。

如需自定义正式域名，将域名加入 `VITE_LIVE_HOSTS`，以英文逗号分隔，只填主机名，并重新构建。未知域名会拒绝连接数据空间。

如确实需要让本地开发连接自己的云端项目，填写配置后设置 `VITE_FIREBASE_EMULATORS=false`；本地主机仍使用预览数据空间。

### 预览与正式数据

| 内容 | 正式版 | 预览版 |
| --- | --- | --- |
| 工作台记录 | `users/{uid}` | `previewUsers/{uid}` |
| 反馈 | `feedback` | `previewFeedback` |
| 本地离线队列 | 正式命名空间 | 独立预览命名空间 |
| 注册与登录身份 | 同一 Firebase Authentication 项目 | 同左 |

两边可以使用同一个账号登录，但任务与测试记录分别保存。发布功能不会把预览数据带到正式版。预览版首次初始化会开启附加模块，便于检查；正式版由新用户在引导中自行选择。

如需查看所有用户反馈，在 Firebase 控制台为管理员 UID 创建 `feedbackAdmins/{uid}` 文档，设置布尔字段 `enabled: true`。管理员仍需验证邮箱；客户端不能自行授予该权限。

## 离线与数据说明

- 首次加载、注册和登录需要网络。已缓存的页面和已加载的记录可在离线时继续使用，修改在应用打开并恢复联网后同步。
- iPhone 可通过 Safari 的“分享 → 添加到主屏幕”安装；桌面端可使用支持 PWA 的浏览器安装。
- 应用完全关闭后没有云端定时任务。重复安排等更新在打开应用时处理。
- 浏览器清理站点数据、系统回收存储或设备丢失可能影响未同步记录，建议定期导出 JSON 备份。
- 完整恢复会替换当前工作台记录；请先备份。CSV 和 ICS 用于交换数据，不能代替完整备份；ICS 仅支持实现中的常见重复规则。
- 当前为持续迭代的个人项目；测试范围以仓库中的测试为准，部署前请检查依赖和自己的环境配置。

## 维护与发布流程

后续功能修改按以下固定流程进行，不需要额外提醒同步 GitHub：

1. **修改并验证**：完成相关代码与检查，保护现有用户记录以及预览 / 正式数据隔离。
2. **同步 GitHub 与中英文文档**：每次修改功能都检查 `README.md` 和 `README.en.md`，将受影响的功能说明、操作步骤和图片同步更新，提交并推送到本仓库。
3. **先发布预览版**：提供预览链接和改动说明，交给项目负责人测试；GitHub 推送本身不会自动发布网站。
4. **确认后更新正式版**：只有项目负责人明确确认当前预览，才将已确认的同一 Hosting 版本发布到正式版。确认后如果功能又有变化，需要重新预览和确认。

发布只更新应用功能，不复制测试数据，也不覆盖用户记录。仅修改文档或 README 图片时，同步 GitHub 即可，不触发网站部署。涉及数据库规则 / 索引时，还需检查它们对正式环境的影响。

完整约定见 [维护与发布说明](docs/MAINTENANCE.md)；维护工具与编码助手应先阅读 [AGENTS.md](AGENTS.md)。

## 项目结构与检查

```text
app/                 页面、组件与样式
lib/                 数据模型、业务逻辑、同步、语言与统计
src/                 应用入口与登录样式
public/              图标、场景图片与 PWA manifest
scripts/             构建检查、预览部署和正式发布
tests/               业务与数据隔离测试
tests/emulator/      Firebase 规则及持久化测试
firestore.rules      数据访问规则
firebase.json        Hosting 和本地模拟器配置
```

```bash
npm test              # 业务逻辑与本地数据测试
npm run test:rules    # 本地模拟器中的规则与隔离测试
npm run build         # 类型检查、打包、生成离线缓存、检查产物
```

测试只使用模拟器或测试数据，不需要生产账号。不要提交 `.env.local`、`.firebaserc`、用户导出、日志、服务账号文件或部署凭证。

## 反馈与许可

欢迎通过 [GitHub Issues](https://github.com/Kylie08ky/daily-in-order/issues) 反馈问题或提出建议。截图和复现材料请先移除个人信息。

本仓库暂未指定项目级许可证；公开可见不代表已授予任意再分发或商用许可。第三方依赖及素材仍适用各自的权利和许可条件。

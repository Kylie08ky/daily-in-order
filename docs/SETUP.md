# 本地运行与部署

[返回项目介绍](../README.md) · [English](SETUP.en.md)

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
2. 复制 [`.env.example`](../.env.example) 为 `.env.local`，填入该 Web 应用的 Firebase 配置。复制 [`.firebaserc.example`](../.firebaserc.example) 为 `.firebaserc`，将 `projects.default` 改为相同的项目 ID。这两个实际配置文件已被 Git 忽略。
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

## 可选：云端 AI

本地模拟器始终关闭真实 AI 请求。自行部署时，按 [Firebase AI Logic 文档](https://firebase.google.com/docs/ai-logic/get-started?platform=web) 配置 Gemini Developer API 和 App Check，再填写 `.env.local`：

```dotenv
VITE_AI_ENABLED=true
VITE_AI_MODEL=gemini-3.5-flash-lite
VITE_APPCHECK_SITE_KEY=your_public_site_key
```

模型名称为仓库当前默认配置，可通过 `VITE_AI_MODEL` 调整；可用模型、额度和数据使用条件以服务商为准，参见 [Firebase 计费说明](https://firebase.google.com/docs/ai-logic/pricing) 和 [Google AI 数据使用条款](https://ai.google.dev/gemini-api/terms)。不要把 Gemini 私密密钥放进前端环境变量。

- App Check 的 reCAPTCHA Enterprise 站点密钥仅允许明确审阅的预览与正式域名，不开启“允许所有域名”。首次正式发布前检查正式域名已加入允许列表。
- 本项目试用流程要求 Spark、未关联 Cloud Billing，不自动升级或切换收费接口。App Check 是项目级配置，修改前检查对正式环境的影响。
- 运行 `npm run check:ai`，只读检查所需 API、站点密钥及结算状态。检查通过后，仍需在真实浏览器生成一份草稿验收；不绕过安全验证。
- 浏览器有每设备、每账号、每天 10 次尝试的计数（UTC，包括失败请求）。这不是服务端限流、防滥用机制或费用上限，清空存储或换设备会重置。面向公众部署时需要另行评估服务端配额与滥用控制。
- 默认发送本次输入、最近六条对话及草稿。用户选择原任务或参考月份时，才附带相应计划上下文；不发送完整工作台、财务或历史笔记。AI 草稿需核对后保存，不写入虚构实际用时或完成数量。
- 验证或生成失败时保留输入，允许改用普通清单；手动清单不依赖云端 AI。

## 可选：书籍封面与微信读书

加入或编辑书籍时，可联网搜索书名、作者或 ISBN 并确认封面；找不到正确版本时可上传图片或填写图片链接。搜索结果需要用户确认，不按相似书名自动覆盖已有书籍。

微信读书需要单独部署只读中转服务并配置 `VITE_WEREAD_GATEWAY`。接入步骤、允许来源和密钥处理边界见 [WEREAD.md](WEREAD.md)。仓库不包含可复用的个人连接凭证。

## 离线与数据说明

- 首次加载、注册和登录需要网络。已缓存的页面和已加载的记录可在离线时继续使用，修改在应用打开并恢复联网后同步。
- iPhone 可通过 Safari 的“分享 → 添加到主屏幕”安装；桌面端可使用支持 PWA 的浏览器安装。
- 应用完全关闭后没有云端定时任务。重复安排等更新在打开应用时处理。
- 浏览器清理站点数据、系统回收存储或设备丢失可能影响未同步记录，建议定期导出 JSON 备份。
- 完整恢复会替换当前工作台记录；请先备份。CSV 和 ICS 用于交换数据，不能代替完整备份；ICS 仅支持实现中的常见重复规则。
- 当前为持续迭代的个人项目；测试范围以仓库中的测试为准，部署前请检查依赖和自己的环境配置。

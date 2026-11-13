# 微信读书连接 / WeRead connection

## 状态与范围

2026-11-13：v0.22.0 前端已按负责人确认原样发布。中转服务的正式来源扩展被自动审批拦截，等待负责人另行确认；目前微信读书连接仍仅在预览可用。部署配置不含个人微信读书密钥，用户在连接时临时提供各自密钥。

2026-11-13: The approved v0.22.0 frontend is now live. Automatic approval review blocked expanding the gateway to production origins; separate owner confirmation remains pending. The connection currently works only from preview. Deployment configuration contains no personal WeRead keys; users supply their own keys for each connection.


2026-11-12：负责人预览环境的只读 Cloudflare Worker 已部署，并设置 `VITE_WEREAD_GATEWAY`；HTTPS、预览来源预检、未登录／无效登录拒绝，以及正式来源拒绝均已验证。已在已登录预览窗口用虚构微信读书密钥验证：通过 Firebase 校验并收到腾讯的无效密钥响应。正式版未更新。真实书架、封面与进度仍需用户在预览界面输入个人密钥验证；本地虚构响应测试不代表真实账号联调通过。自行部署者仍需配置自己的 Worker；未配置时界面明确提示不可连接。

- 阅读书房 → 连接微信读书 → 输入个人 API Key → 选择电子书 → 关联旧书或新增 → 同步所选书籍。
- 从 [微信读书官方页面](https://weread.qq.com/r/weread-skills)获取个人密钥；不要粘贴进聊天、Git、构建环境或调试日志。
- 密钥只保留在打开的连接窗口内，经专用 Worker 转发至腾讯；不保存到 Firestore、本地存储、离线队列或备份。关闭、断开或完成同步后清除。下次连接需重新输入。
- 仅请求 `/shelf/sync` 和 `/book/getprogress`。不请求笔记接口，不导入阅读时间；上游响应即使附带时间也被网关丢弃。
- 微信读书百分比保存在独立书籍快照中，不换算为纸质页码、不覆盖手填页码与历史记录。未知总页数为 `null`，不虚构 100 页。
- 已关联书籍按远端 book ID 更新，重复同步不会复制书籍。同名旧书必须确认关联，不能默认为新书。原书籍 ID、任务、投入、专注、完成状态与阅读日期保持不变。
- 每次最多同步 50 本；全部远端进度读取成功后一次提交。某本失败则此次不提交，选择保留。保存采用现有离线操作与云端版本冲突检查，密钥不进入待同步操作。
- 目前为手动刷新，不是自动后台同步；有声书和文章收藏不在首版列表中。封面采用腾讯返回的 HTTPS 图片，源图片失效会显示占位。

## 部署独立的免费 Worker

1. 注册并登录 Cloudflare，使用 Workers Free。不升级 Firebase Blaze，不开通付费产品。
2. 在 `integrations/weread/` 将 `wrangler.example.jsonc` 复制为 `wrangler.jsonc`（已忽略）。填写 Firebase 项目 ID、该项目公开 Web API key 和**精确预览 origin**。不要填微信读书个人密钥。
3. 通过官方 Wrangler 登录，检查授权范围后授权。部署所需 OAuth scopes 为 `account:read user:read workers:write workers_scripts:write`，不需要申请全部产品权限。执行 `npx wrangler deploy --config wrangler.jsonc`。使用独立 Worker 名称；不修改现有 Worker 或正式站点。配置已关闭 Worker 观测日志；代码不输出请求或密钥。
4. 保留 `RATE_LIMITER` binding：每位置每 IP 和 UID 每分钟最多 100 次（Cloudflare 计数是每边缘位置，不是全球精确配额）。未配置限流、Firebase 信息或允许域名时服务拒绝请求。
5. 将获得的 `https://<worker>.<account>.workers.dev/weread` 写入**部署目录的本地环境文件** `VITE_WEREAD_GATEWAY`。保留公开仓库 `.env.example` 中的空值。
6. 完成检查后只发布 `workbench-review`。验证预览来源 OPTIONS 为 204、未登录 POST 为 401、非白名单 origin 为 403。生产 origin 不应在允许列表内。首次创建 `workers.dev` 子域名后，须等待 HTTPS 生效；不可跳过证书验证。以后发布正式版前，需要另外审核连接服务的正式域名配置，不能只提升前端版本。
7. 在预览中由用户输入自己的密钥，验证书架、真实封面和阅读百分比。操作前后核对书籍数与原阅读时长；只有此次真实联调成功才可宣称接通。当前阶段没有进行这一步。

网关通过 Firebase `accounts:lookup` 在线核验 ID token、账号启用与邮箱验证，且限制项目 audience/issuer。随后只向固定腾讯 HTTPS 地址发送个人微信读书密钥，不支持任意 URL、写操作或重定向。所有响应 `no-store`，错误不会原样回显第三方响应。没有数据库或个人密钥存储绑定。

若 Firebase Web key 限制只允许浏览器 referrer，应为此服务单独配置限定 Identity Toolkit API 的项目 Web key；不要为了通过请求解除现有密钥的限制。配额不足、接口升级或密钥失效时明确报错，不能绕过认证。

测试：`node --test tests/weread*.test.mjs`，以及维护流程要求的全部单元、模拟器和构建检查。官方协议参考：[Tencent/WeChatReading](https://github.com/Tencent/WeChatReading/tree/main/skills)，当前适配 `skill_version: 1.0.5`；遇 `upgrade_info` 停止请求并升级适配器。

## English

2026-11-12: the owner’s preview-only Worker is deployed and `VITE_WEREAD_GATEWAY` is configured. HTTPS, allowed-origin preflight, missing/invalid-login rejection and production-origin rejection were verified. An authenticated preview request with a synthetic invalid WeRead key reached Tencent and returned the expected invalid-key response. Production is unchanged. Actual shelf, cover and progress verification still requires the user’s personal key in the preview UI. Synthetic tests do not establish live-account success. Self-hosters must deploy and configure their own Worker; an unconfigured instance reports this explicitly.

Open Reading → Connect WeRead, obtain a personal key on the [official page](https://weread.qq.com/r/weread-skills), load the e-book shelf and select the books to sync. Link existing books explicitly; an existing remote book ID is updated rather than duplicated. The key stays only in the dialog’s memory and is cleared on closing, disconnecting or successful sync. It is never part of the workspace, backups or offline queue. Reconnecting requires re-entering the key.

The bridge permits only shelf and progress reads, strips reading time and unused fields, and stores no secrets. Percentage progress is a separate snapshot: it never replaces manual page history or converts to invented paper page counts. Tasks, sessions, actual time and completion records remain untouched. This release supports manual refresh for up to 50 e-books per batch, not background syncing, audiobooks or articles. Any failed book fetch cancels the entire batch; existing conflict detection and stable IDs protect retries.

Deployment:

1. Use a Cloudflare Workers Free account. Do not enable paid services or Firebase Blaze.
2. Copy `integrations/weread/wrangler.example.jsonc` to ignored `wrangler.jsonc`. Set your Firebase project, its public Web API key and the exact preview origin only. Never put a personal WeRead key in config.
3. Authenticate with official Wrangler using `account:read user:read workers:write workers_scripts:write`, review the requested permissions (not all product scopes), and deploy the independent Worker with `npx wrangler deploy --config wrangler.jsonc`. Keep request observability disabled and the `RATE_LIMITER` binding configured (100 requests per minute per IP and UID, per Cloudflare edge location). The bridge fails closed when required config is absent.
4. Set `VITE_WEREAD_GATEWAY=https://<worker>.<account>.workers.dev/weread` only in the local deployment environment. Run all required checks and deploy preview only.
5. Verify allowed-origin preflight, missing-token rejection and disallowed-origin rejection. For a new `workers.dev` subdomain, wait for HTTPS provisioning without disabling certificate validation. Production needs a separate review of the gateway origin configuration before promoting the frontend. The owner then tests their personal key in the preview UI; check covers, progress and unchanged reading time before declaring the integration connected. Live-account testing has not yet been performed.

Firebase `accounts:lookup` verifies the user online, including account status and verified email; project audience/issuer are also checked. Credentials are forwarded only to the hard-coded Tencent endpoint over HTTPS. No arbitrary proxying, upstream writes, redirect following, request-body logging or response caching. If a Web key has browser-only restrictions, use a separate key restricted to Identity Toolkit rather than weakening the existing key. The bridge stops on Tencent `upgrade_info` and currently reports skill version 1.0.5. Tests: `node --test tests/weread*.test.mjs` plus the full maintenance checks.

### Worker runtime compatibility / 运行时兼容

Use `redirect: "manual"` and reject non-2xx responses for both Google and Tencent requests. Workers does not implement Fetch `redirect: "error"`; it throws before sending the request. Do not replace it with `follow`, which could forward credentials. Network/service failures return a service error instead of asking the user to sign in again. [Cloudflare Request reference](https://developers.cloudflare.com/workers/runtime-apis/request/).

Google 与腾讯请求都使用 `manual` 并拒绝非成功响应，保持不跟随跳转；网络或服务失败提示连接服务异常，不误报为退出登录。诊断只包含固定错误类别，不包含密钥、令牌或第三方原始响应。

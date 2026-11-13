# 维护与发布 / Maintenance and releases

[中文 README](../README.md) · [English README](../README.en.md)

## 中文

本流程由项目负责人确认，是后续功能维护的默认约定。无需每次重复提出“同步 GitHub 和 README”。

### 一次功能修改的完成条件

1. 完成功能，检查与现有数据的兼容性；测试只使用本地模拟器与虚构记录。
2. 运行相关验证，以及 `npm test`、`npm run test:rules`、`npm run build`。
3. 核对中文 `README.md` 与英文 `README.en.md`，同步更新受影响的功能、步骤、限制和截图。若说明不受影响，可保持原文，并在交付时说明已核对。
4. 检查提交范围，仅将本次相关代码与文档提交、推送至 `Kylie08ky/daily-in-order`。公开副本保留通用配置，排除私人资料、实际环境文件、用户导出、调试日志和凭证。
5. 通过 `npm run deploy:preview` 更新 `workbench-review`。向负责人提供预览链接、Git 提交、改动内容及检查结果；说明暂未发布正式版。
6. 等负责人明确确认**当前预览**。新的功能变化不能沿用旧的确认。
7. 确认后执行 `npm run release:friends -- --confirm-reviewed-preview`，将已审阅的 Hosting 版本原样提升到正式版，核对正式站点并报告结果。若预览已过期，需要重新部署和确认。

### 环境与数据边界

- 代码公开和网站上线是不同操作；GitHub 推送不触发正式发布。
- 预览数据、正式数据和每个用户的数据保持隔离；发布不复制测试数据、不清空或替换个人记录。
- Firestore 规则与索引是共享的项目级配置。预览部署包含这些更新时，应先检查兼容性，不能把它们当作仅影响预览的操作。
- 如实际部署代码在另一个本地目录维护，应将相关功能改动同步到公开仓库，并保留两边各自的环境配置；禁止整个目录连同配置、数据直接覆盖。
- 未完成检查、认证失效或推送 / 部署失败时，如实说明当前完成到哪一步，不宣称已经同步或发布。

### 文档与图片

仅改文档或 README 图片：检查中英内容、相对链接、图片显示和隐私，再提交并推送 GitHub；不部署网站。

图片必须来自空白界面或虚构测试账号。更新相关界面后，检查旧图是否仍准确；需要更换时，同时检查两种语言的引用和说明。

## English

This is the project owner's standing maintenance agreement. A separate request to synchronize GitHub and the READMEs is not needed for each feature change.

### Definition of done for a feature change

1. Implement the feature and check compatibility with existing data. Test only with local emulators and synthetic records.
2. Run relevant verification plus `npm test`, `npm run test:rules` and `npm run build`.
3. Review the Chinese `README.md` and English `README.en.md`. Update affected features, steps, limitations and screenshots together. Leave unaffected instructions intact and report that they were reviewed.
4. Review the commit scope and push only relevant code and documentation to `Kylie08ky/daily-in-order`. Keep public configuration generic; exclude private material, actual environment files, user exports, debug logs and credentials.
5. Update `workbench-review` with `npm run deploy:preview`. Give the owner the preview URL, Git commit, change summary and verification results, and state that production has not been updated.
6. Wait for explicit approval of **that current preview**. New feature changes require a new review rather than reusing earlier approval.
7. After approval, use `npm run release:friends -- --confirm-reviewed-preview` to promote the exact reviewed Hosting version. Verify the live site and report the result. An expired preview must be redeployed and approved again.

### Environment and data boundaries

- Publishing source and releasing the website are separate operations. A GitHub push does not trigger a production release.
- Keep preview, production and individual users' records isolated. A release must not copy test data, clear records or replace personal workspaces.
- Firestore rules and indexes are shared project-level configuration. Check compatibility before deploying them; a preview URL does not limit their impact to preview.
- If the deployment app lives in a separate local checkout, port the corresponding feature changes into the public repository while preserving each environment's configuration. Never overwrite an entire directory with configuration and data included.
- If checks, authentication, push or deployment fail, report the actual completed stage rather than claiming synchronization or publication succeeded.

### Documentation and images

For documentation-only or README-image changes, check both languages, relative links, image rendering and privacy, then commit and push. Do not deploy the website.

Screenshots must show empty interfaces or synthetic test accounts. After a related UI change, check whether existing images remain accurate and update both README references and captions when needed.

## 版本足迹 / Release history

- 每次预览修改在 `lib/update-history.ts` 增加带稳定 ID、版本号与开发日期的条目，并补齐中英德文案。构建输出 `release-notes.json`，与入口脚本摘要绑定。
- 预览页显示开发明细；正式页仅显示 `releaseHistory/live` 的发布批次。该文档只包含公开更新说明，客户端仅能读取，不能写入或枚举集合；发布脚本通过已有 CLI 管理授权写入，不接触任何用户工作台。
- `npm run release:friends -- --check` 只核对当前预览及待发布内容。获得用户对当前预览的确认后，使用原发布命令；脚本按确切 Hosting 版本发布，不重建，从 Hosting 获取实际发布时间（展示使用 Europe/Berlin 日期），仅把上次正式版之后的更新合成一条。
- 同一 Hosting 版本重复运行不新增记录；元数据写入采用版本前置条件，避免覆盖并发发布。若 Hosting 已成功、更新记录写入失败，脚本明确报错；用同一已批准命令重试，仅补记同一发布，不重新构建。未发布、失败的发布不进入正式足迹。
- 已核实的历史 v0.8.2、v0.15.0 作为离线/初始回退；其他旧日期不推测。自行部署的维护者应替换 `knownReleases`，不要沿用本服务历史。

- Add every preview iteration to `lib/update-history.ts` with a stable ID, version and development date; keep Chinese, English and German copy aligned. Builds produce `release-notes.json` tied to the entry digest.
- Preview displays development changes. Production displays publication batches from the public, client-read-only `releaseHistory/live` document. Only public release copy is stored; the authenticated CLI publisher never reads user workspaces.
- `npm run release:friends -- --check` is read-only. After explicit approval, the standard release command pins and promotes the reviewed Hosting version without rebuilding, then records only changes since the previous release using Hosting’s actual release time (Europe/Berlin date).
- A repeated Hosting version is idempotent. Conditional metadata writes reject concurrent overwrites. If Hosting succeeds but metadata fails, the command reports this partial outcome; rerun the same approved command to repair that release’s metadata without rebuilding. Failed or unapproved releases never enter production history.
- Verified v0.8.2 and v0.15.0 entries are initial/offline fallbacks; other historical dates are not inferred. Self-hosters must replace `knownReleases` with their own history.

# Screenshot notes / 截图说明

## Current README images / 当前 README 图片

Updated on **2026-11-13**, using **v0.24.2** application code (initial set at `49b140e`; expanded gallery at `9ff1ef9`, with unchanged application code). These are browser captures of the running application, not mockups or AI-generated images.

2026-11-13 使用 v0.24.2（原有截图基于 `49b140e`，新增图库基于 `9ff1ef9`，应用代码未改变）本地应用重新拍摄。图片来自实际运行的界面，不是设计稿或 AI 生成图片。

| Files / 文件 | View / 画面 | Capture / 拍摄方式 |
| --- | --- | --- |
| `today-demo-zh.jpg` / `today-demo-en.jpg` | Today overview in list mode / 今日概览列表模式 | Full page, 1440 px desktop viewport / 1440 像素桌面视口，全页截图 |
| `timeline-demo-zh.jpg` / `timeline-demo-en.jpg` | Daily timeline, project progress and notes / 时间轴、项目进度与随记 | Dashboard region, captured directly by the browser / 浏览器直接截取仪表盘区域 |
| `quick-start-zh.jpg` / `quick-start-en.jpg` | Current AI planning entry / 当前 AI 规划入口 | 1440 × 1100 viewport, empty input / 1440 × 1100，空白输入 |
| `focus-demo-zh.jpg` / `focus-demo-en.jpg` | Full-screen focus / 全屏专注 | 1440 × 1100, actual running countdown / 1440 × 1100，实际运行的倒计时 |
| `monthly-demo-zh.jpg` / `monthly-demo-en.jpg` | Monthly goals and weekly budgets / 月度目标与各周预算 | 1440 × 1320 desktop viewport / 桌面视口 |
| `weekly-demo-zh.jpg` / `weekly-demo-en.jpg` | Weekly planning and daily availability / 每周安排与每日可用时间 | 1440 × 1320 desktop viewport / 桌面视口 |
| `learning-demo-zh.jpg` / `learning-demo-en.jpg` | Modules, activities, time and quantity / 学习模块、子项、时长与数量 | 1440 × 1320 desktop viewport / 桌面视口 |
| `reading-demo-zh.jpg` / `reading-demo-en.jpg` | Fictional bookshelf and reading positions / 虚构书架与阅读位置 | 1440 × 1320 desktop viewport / 桌面视口 |

### Static screenshot data and privacy / 静态截图的数据与隐私

- Only the local `demo-friends-isolation` Authentication and Firestore emulators were used. The site ran on localhost with emulator mode explicitly enabled.
- The original four screenshot sets use dedicated Chinese and English synthetic accounts, with translated versions of three fictional projects and six tasks. Two tasks are complete; a third has partial effort. The projects concern website design, English practice and reading.
- The added planning, learning and reading gallery uses separate synthetic accounts: three monthly goals (44 hours total), three learning modules with four activities (140 minutes), and three fictional books with 50 minutes of linked reading. The sample course is at 12/40; book positions are 96/240 and 54/180. Default cover placeholders are shown, with no real book search or WeRead connection.
- Notes explicitly identify the content as a fictional README example. Optional lifestyle modules are off in the original four sets to highlight the scheduling workflow.
- The PREVIEW label is the app's normal local test-space indicator. It does not mean these images contain the owner's preview workspace.
- Focus captures show a real timer started through the interface for the fictional design task. Virtual rewards are not income; capture times may differ slightly between languages.
- AI captures show the real entry and built-in example prompts. Cloud AI is disabled for emulator projects. No actual AI request, mock generated answer or simulated provider result is shown.
- No production database, personal workspace, private backup, real user account or personal export was read or copied. Temporary fixture scripts and emulator records remain outside the published files.

仅使用本地账号与数据库模拟器，强制开启模拟器模式。中英文分别使用专用虚构账号，展示相同的三个示例项目和六项任务：两个已完成，一个有部分投入。项目为网站设计、英语练习和阅读，随记中明确标注为 README 虚构演示。原有四组截图关闭附加生活模块，以突出日程与项目。新增图库使用另一组虚构账号，包含三个合计 44 小时的月目标、三个学习模块与四个子项（实际 140 分钟）、三本虚构书及 50 分钟关联阅读。示例课程为 12/40，书籍页码为 96/240、54/180。展示默认封面占位，不查询真实书籍或连接微信读书。

PREVIEW 是本地测试空间的正常标识，不是作者预览工作台的数据。专注截图来自界面中实际启动的倒计时；AI 截图只展示当前入口与内置示例，未调用云端 AI，也未伪造生成结果。

没有读取或复制生产数据库、私人工作台、个人备份或真实用户资料。临时初始化脚本和模拟器记录不进入公开提交，演示数据也不会成为新用户默认数据。

### Review / 检查

All sixteen images were opened and visually inspected after capture. Both READMEs reference the corresponding language images in two-column tables, linked to the original files for full-size viewing. Full-page captures retain the real scrolling behavior of inner panels; region captures are not reconstructed or retouched.

十六张图片均已打开检查，中英文 README 分别引用对应语言图片，采用两列排布，点击图片可查看原图。全页截图保留界面内部面板的真实滚动状态；局部截图直接取自浏览器，未拼接或修饰界面。

## Combined planning walkthrough / 完整规划动图

Recorded on **2026-11-13** from local **v0.24.2** application code at `07d11ae`. Each README now embeds one standalone, full-width walkthrough in its own language. The static screenshot gallery remains in two columns; animated recordings are not played side by side.

2026-11-13 基于 `07d11ae` 的 v0.24.2 本地应用录制。中英文 README 各单独展示一段对应语言的完整动图；静态图库保留两列排布，动图不再并排播放。

| Files / 文件 | Dimensions / 尺寸 | Duration / 时长 | Size / 大小 |
| --- | --- | --- | --- |
| `planning-walkthrough-zh.gif` | 1120 × 834 | 70.05 s | 5.09 MiB |
| `planning-walkthrough-en.gif` | 1120 × 834 | 70.34 s | 5.50 MiB |

The same fictional website-design project runs through four chapters:

1. Set a 12-hour monthly goal. Allocate it automatically by the days of each week within November, then adjust the current week to 3 hours and the next to 2 hours 36 minutes, keeping the total at 12 hours.
2. Inspect the weekly capacity view and add a one-hour session at 10:00 to the existing six-hour “Sketch the home page” task. The fixture also contains a separate 30-minute team check-in and another six-hour design task.
3. Move that session from 10:00 to 10:30 on the daily timeline, preserving its one-hour duration and original task association.
4. Start, pause and resume a real stopwatch session for that task. No completed work session or financial return is claimed.

同一个虚构「创意网站设计」项目贯穿四步：设置 12 小时月目标，按当月各周天数自动分配后，把本周微调为 3 小时、下周调为 2 小时 36 分钟，总额仍为 12 小时；查看每周可用时间，为原有 6 小时「完成首页草图」任务安排今天 10:00 的 1 小时分段；在时间轴将它拖到 10:30；开始、暂停并继续真实正向计时。另有一项 30 分钟团队晨会和另一项 6 小时设计任务，全部是虚构数据。演示没有把计划当作实际投入，也未宣称完成整段工作或获得真实收益。

- New synthetic accounts were created only in the local `demo-friends-isolation` Authentication and Firestore emulators. No personal account, production data, browser profile, private backup or WeRead connection was accessed.
- Re-recorded actual UI actions in isolated 1440 × 1000 desktop browser contexts at approximately 5 fps. Frames were resized to 1120 × 778; a separate 56 px editorial chapter strip was added above the interface.
- A high-contrast pointer follows coordinates recorded during actual browser mouse movements. Click rings mark mouse presses/releases, and a short trail marks the timeline drag. These overlays and the chapter strip are demonstration aids, not application features. No app content or timer values were fabricated.
- Slow, deliberate mouse movements and 3–3.5-second reading pauses were recorded directly, retaining roughly 26 seconds for monthly allocation and 19 seconds for weekly scheduling. Focus plays at real speed. Navigation between chapters is cut; chapter endings are held briefly. Identical frames are coalesced in looping 128-color GIFs.
- UI assertions verified a 12-hour allocation total, the saved one-hour session and its new 10:30 start time. Both encoded GIFs were decoded and their chapter key frames inspected, including visible pointers, click rings, the drag and paused/resumed focus. README image links and encoded frame durations were checked.
- Only documentation and public media are changed. The website and real user records are not updated. Temporary fixture and capture scripts stay outside the public commit.

仅在本地模拟器创建虚构测试账号，以隔离浏览器重新录制真实点击、输入和拖动。未读取个人账号、生产数据、浏览器个人资料、私人备份或微信读书连接。1440 × 1000 桌面画面约每秒采集 5 帧，缩放至 1120 × 778，再在画面外增加 56 像素步骤标题。可见光标按录制时实际鼠标坐标叠加，按下或释放时显示点击圆环，拖动时间轴时显示短轨迹；这些与步骤标题均为演示辅助，不是应用新增功能。

录制时使用较慢的鼠标移动，并在关键结果处停留 3–3.5 秒，月度分配约 26 秒、每周安排约 19 秒；专注按真实速度播放。省略章节间导航等待，章节末短暂停留，采用 128 色循环 GIF 并合并重复帧，不修改界面内容或计时数字。录制中核对 12 小时总分配、保存的 1 小时安排与 10:30 开始时间；编码后检查两种语言的解码关键帧、鼠标与点击提示、拖动、暂停和继续状态、播放时长及 README 链接。本次只更新文档与公开媒体，不部署网站，不改真实记录。

## Real AI assistant walkthrough / 真实 AI 助手动图

Captured on **2026-11-13** from the v0.24.2 preview in ordinary Edge, using a dedicated test account and fictional content. The owner explicitly requested real AI generation instead of a mock reply; this recording is the cloud-preview exception to the local-only capture workflow used above.

2026-11-13 在普通 Edge 浏览器的 v0.24.2 预览版录制，使用专用测试账号与虚构内容。用户明确选择真实 AI 生成，因此本段使用云端预览，区别于上面的本地模拟器截图与规划动图。

| Files / 文件 | Dimensions / 尺寸 | Duration / 时长 | Size / 大小 |
| --- | --- | --- | --- |
| `ai-assistant-walkthrough-zh.gif` | 1120 × 834 | 38.8 s | 0.88 MiB |
| `ai-assistant-walkthrough-en.gif` | 1120 × 834 | 38.8 s | 0.91 MiB |

The prompt requests a new “摄影入门 · README 演示” project with camera settings (30 minutes), composition practice (45 minutes) and photo organization (20 minutes), all scheduled for tomorrow with no fixed start time. The captured flow includes consent, one real generation request, the returned project/task drafts, review of all three schedules and a successful save. The 95 minutes are planned time, not actual effort.

输入要求创建虚构「摄影入门 · README 演示」项目：了解相机设置 30 分钟、练习构图 45 分钟、整理照片 20 分钟，全部安排到明天，开始时间留空。记录包含同意发送、一次真实生成请求、返回的项目与任务草稿、逐项核对和成功保存。合计 95 分钟属于预计用时，不是实际投入。

- Both files use the same actual Chinese UI capture. English labels translate the editorial explanation and task summary; they do not represent a second English AI request or an English UI recording.
- This is an edited keyframe walkthrough, not continuous real-time video. Waiting and scrolling are shortened, while results are held for reading. The captured pointer/halo and added gold rings identify observed clicks; captions sit outside the app. No AI reply, draft values or success state is reconstructed.
- Only the dialog is published. Browser chrome, account information and surrounding workspace are cropped out. The recording creates synthetic preview plans only; it does not use personal workbench records, backups or production workspace data. No actual effort or completion records are invented.
- No App Check policy, allowed domains, authentication rules or billing settings were changed. There is no website deployment for this documentation update.
- Decoded GIF keyframes, duration, image integrity and both README links were checked. Raw full-window captures, capture scripts, logs and credentials remain outside the public commit.

两份动图使用同一段中文界面真实操作；英文版仅翻译画面外的步骤说明与任务摘要，并非另一次英文 AI 请求或英文界面录像。动图以实际关键画面剪辑，缩短等待和滚动，延长结果停留；鼠标与光晕来自捕获画面，金色点击圈标示实际点击位置，未重构 AI 回复、表单值或保存结果。

只公开裁切后的弹窗，排除浏览器工具栏、账号信息与背景工作台。本次仅创建虚构的预览测试计划，不使用私人工作台、备份或正式工作区资料，不伪造实际投入。未修改安全验证、域名白名单、认证规则或付费设置，也不部署网站。已检查解码关键帧、播放时长、图片完整性及双语引用；原始全窗口截图、脚本、日志和凭证不公开。

## Earlier interaction recordings / 之前的短动图

These standalone clips are retained for direct links but are no longer embedded in the main READMEs.

以下短动图保留原链接，但主 README 已改用上面的完整演示。


Captured on **2026-11-13** from local **v0.24.2** application code at `3f7fa40`. The site and real user records were not changed.

2026-11-13 基于 `3f7fa40` 的 v0.24.2 本地应用录制；没有更新网站或修改真实用户记录。

| Files / 文件 | Interaction / 操作 | Duration / 时长 |
| --- | --- | --- |
| `schedule-motion-zh.gif` / `schedule-motion-en.gif` | Switch list/timeline, move a fictional reading task from 11:00 to 11:30, then resize 45 minutes to 60 minutes / 切换列表与时间轴，将虚构阅读任务从 11:00 拖到 11:30，再从 45 分钟调整为 60 分钟 | About 10 seconds / 约 10 秒 |
| `focus-motion-zh.gif` / `focus-motion-en.gif` | Select stopwatch, start, pause and resume a fictional design task / 为虚构设计任务选择正向计时，开始、暂停与继续 | About 13 seconds / 约 13 秒 |

- Recorded in fresh browser contexts against the local `demo-friends-isolation` emulators, using only the fictional projects and tasks described above. No production login, data, credentials or personal browser profile was used.
- Frames were captured from real browser actions at approximately 5 fps, resized to 960 px wide and encoded as looping GIFs. Frame timing is preserved; identical frames are coalesced and the final frame is held briefly before replay. No interface or timer values were fabricated.
- Both schedule changes were verified in the UI after saving. All four encoded GIFs were checked through decoded key frames, durations and image integrity. Each file is smaller than 1 MB.
- Focus shows real seconds and virtual growth points, including the pause. It does not claim to demonstrate a finished work session or a real financial return.

仅连接本地模拟器，以独立浏览器会话操作虚构测试账号。未使用生产登录、个人浏览器资料或真实记录。约每秒采集 5 帧，缩放到 960 像素宽后编码为循环 GIF，保留采集时序并合并相同帧，末帧短暂停留后循环；没有修改界面内容或伪造计时数字。时间轴的移动和时长调整均已核对保存结果，四张动图均已检查解码关键帧、播放时长及文件完整性，每张小于 1 MB。专注仅展示真实计时、暂停与虚拟激励，不代表已完成任务或实际收益。

## Other retained assets / 其他保留图片

These older files are not currently embedded in the main READMEs:

以下旧图片目前未用于中英文主 README：

- `sign-in-zh.jpg` / `sign-in-en.jpg`: empty sign-in forms; no account information. / 空白登录表单，无账号资料。
- `nutrition-demo-zh.jpg`: synthetic local nutrition records, not a recommended diet or real health data. / 本地虚构营养记录，不是饮食建议，也不是真实健康数据。

When refreshing images, use empty forms or explicitly synthetic local accounts, inspect every image, and update both language references. Never publish a real workspace even if its email is hidden.

后续更新仍须使用空白表单或明确的本地虚构数据，逐张检查并同步两种语言的引用。即使隐藏了邮箱，也不能公开真实用户工作台。

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

### Data and privacy / 数据与隐私

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

## Interaction recordings / 交互动图

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

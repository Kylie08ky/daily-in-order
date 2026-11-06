# Screenshot notes / 截图说明

These are actual application screenshots, not design mockups.
这些图片来自实际应用，不是设计效果图。

| File | Content / 内容 | Data / 数据 |
| --- | --- | --- |
| `sign-in-zh.jpg` | Chinese sign-in page / 中文登录页 | Empty form; no account details / 空白表单，无账号资料 |
| `sign-in-en.jpg` | English sign-in page / 英文登录页 | Empty form; captured before the German selector was added / 空白表单，拍摄时尚未加入德语切换入口 |
| `nutrition-demo-zh.jpg` | Optional nutrition module / 可选每日摄入模块 | Local acceptance-test account with synthetic entries / 本地验收测试账号与虚构记录 |
| `today-demo-zh.jpg` / `today-demo-en.jpg` | Today dashboard / 今日概览 | Two local emulator accounts, synthetic projects/tasks/notes / 两个本地模拟账号，虚构项目、任务和随记 |
| `timeline-demo-zh.jpg` / `timeline-demo-en.jpg` | Daily timeline / 当日时间轴 | Synthetic actual time spans and planned tasks / 虚构实际投入时段与任务安排 |
| `focus-demo-zh.jpg` / `focus-demo-en.jpg` | Running focus timer / 运行中的专注计时 | Real timer interaction with a synthetic task; virtual points / 虚构任务上的实际计时交互与虚拟成长值 |

The nutrition screenshot demonstrates the interface, not a recommended diet. It does not contain real user health records. The interface may change as the app evolves.
营养截图仅展示界面，不是饮食建议，不含真实用户健康记录。后续界面可能随版本更新。

When replacing screenshots, use an empty form or a local emulator account with explicitly synthetic data. Never publish screenshots of a real user's workspace, even if the email is hidden.
更新截图时，使用空白表单或本地模拟器中的虚构数据。即使已隐藏邮箱，也不要公开真实用户工作台截图。

## New demo capture / 新增演示截图

Captured on 2026-11-04 from the local development app using the `demo-friends-isolation` Auth and Firestore emulators. The Chinese and English captures use separate synthetic accounts, three example projects and six tasks. Two tasks are complete and a third has partial time recorded. Optional lifestyle modules are turned off for this demo. Focus screenshots show the running 25-minute countdown and virtual growth points; their times differ because they were captured separately.

2026-11-04 在本地开发应用中拍摄，使用 `demo-friends-isolation` 的账号与数据库模拟器。中英文分别使用独立虚构账号、三个示例项目与六项任务；两项完成，一项已记录部分投入。为突出日程与项目，本组演示关闭了可选生活模块。专注截图展示正在运行的 25 分钟倒计时和虚拟成长值，两种语言因拍摄时刻不同而显示不同时间。

No real workspace, personal export or production database was used. The temporary account setup scripts and emulator records are not part of the published repository, and no demo content was added to new-user defaults.

没有使用真实工作台、个人导出或生产数据库。临时账号初始化脚本和模拟器记录不进入公开仓库，演示内容也不会成为新用户默认数据。

- `quick-start-zh.jpg` / `quick-start-en.jpg`: v0.7.1 AI introduction and assistant, local `demo-friends-isolation` synthetic account. Empty input, no cloud AI call and no personal records. Captured at normal desktop viewport.


### AI entry update / AI 入口更新（2026-11-06）

Replaced both `quick-start-zh.jpg` and `quick-start-en.jpg` with the AI-first introduction and standalone assistant. Captured in the local emulator using a synthetic account and empty input. No cloud AI requests or real user records are included.

中英快速开始截图已更新为 AI 入门与独立助手，使用本地模拟器虚构账号及空白输入，未调用云端 AI，不含真实用户记录。

### Conversational onboarding / 对话式入门（v0.8.0）

Updated both quick-start screenshots using a synthetic local emulator account. Chinese shows the automatic first-login introduction; English shows reopening it from Settings → User guide. The project/task draft adapter used in local UI testing is a fixture, not a real AI response; these entry screenshots show no generated results. No real user records or production data were used.

两张快速开始截图已更新：中文展示首次登录自动引导，英文展示从设置 → 使用指南重新打开。均使用本地模拟器虚构账号。本地界面验收使用虚构草稿适配器，不代表真实 AI 返回；本组入口截图不含生成结果，也未使用真实用户或生产数据。

### Sidebar fit / 侧栏适配（v0.8.1，2026-11-06）

Replaced `today-demo-zh.jpg` and `today-demo-en.jpg` with local emulator captures at 1280 × 720. Each synthetic account has three projects and six tasks, all unfinished, with partial recorded time; life modules are enabled to exercise a scrolling sidebar. Avatar, name and Settings remain visible below the navigation. Timeline and focus screenshots remain earlier examples.

两张今日概览图片已替换为 1280 × 720 本地模拟器截图：中英文虚构账号各有三个项目、六项未完成任务及部分投入记录，开启生活模块以检查长目录滚动。头像、名称和设置在目录下方保持可见。时间轴与专注图片仍为较早的演示截图。

### Language in Settings / 设置内语言切换（v0.8.2，2026-11-06）

Refreshed both Today screenshots with the same synthetic local accounts and 1280 × 720 viewport after moving the language selector into Settings. The workspace no longer has a top language bar.

语言切换移到设置页后，使用同类本地虚构账号重新截图；两张今日概览均为 1280 × 720，工作台顶部不再显示语言栏。

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

- `quick-start-zh.jpg` / `quick-start-en.jpg`: v0.7.0 quick-entry dialog, local `demo-friends-isolation` synthetic account. Plain-list input only, no cloud AI call and no personal records. Captured at normal desktop viewport.

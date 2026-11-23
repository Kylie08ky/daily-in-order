<div align="center">

<img src="public/icons/icon-192.png" alt="Daily in Order icon" width="64" />

# Daily in Order · 日常有序

**Make room for what you want to do.**

From monthly goals to today's tasks: plan your time, focus on the work, and keep track of your progress in one workspace.

[Get started](https://personal-daily-organize.web.app/?lang=en) · [简体中文](README.md) · [Feedback](https://github.com/Kylie08ky/daily-in-order/issues)

Desktop first · 中文 / English / Deutsch · Installable web app

</div>

<table>
<tr>
<td width="50%" valign="top">
<strong>Today overview</strong><br />
<a href="docs/images/today-demo-en.jpg"><img src="docs/images/today-demo-en.jpg" alt="Today overview" width="100%" /></a>
<br />Daily plans, project progress and notes.
</td>
<td width="50%" valign="top">
<strong>Daily timeline</strong><br />
<a href="docs/images/timeline-demo-en.jpg"><img src="docs/images/timeline-demo-en.jpg" alt="Daily timeline" width="100%" /></a>
<br />Actual effort and future plans on one timeline.
</td>
</tr>
</table>

When completing a video-course task, record video quantities, IDs and viewing type against a selected session. Completion and progress editing share the same record; adding progress does not add time. (v0.25.4 preview)

## Start with one goal

Want to finish a course, move a personal project forward, or make time for reading? Turn it into a project, then decide how much time to give it this week and today. Your plans can change without losing track of the effort you have already put in.

1. **Register and verify your email** to open your own workspace.
2. **Tell the AI assistant what you want to do.** Review the draft to create projects, tasks and schedules together, or add them manually.
3. **Start with one task today:** schedule it, start focusing, or record progress you have already made.

You do not need to configure everything at once. Enable learning, reading, habits, fitness and budgets as you need them.

## Turn a sentence into your first plan

> Tomorrow I'd like to start learning photography: 30 minutes on camera settings, 45 minutes practicing composition, and 20 minutes organizing photos. Keep them in one project and leave the start times open.

The assistant turns your ideas into an editable draft with linked projects, tasks and dates. Nothing is added until you review and confirm it, and you do not need to fill out the same plan again.

![AI assistant: describe a goal, review the draft, and create projects and tasks](docs/images/ai-assistant-walkthrough-en.gif)

*Real AI interaction using a sample project. You can also ask the assistant to break down monthly and weekly plans, create reusable tasks, or revise the remaining work for an existing task.*

## Bring a monthly goal into your day

**Monthly goals → Weekly allocation → Daily plans → Focus → Review**

Choose the projects you want to work on this month and estimate the time they need. Allocate that time across weeks, then schedule tasks around fixed commitments and the time available each day.

Follow a 12-hour design goal through weekly allocation, daily scheduling, a timeline adjustment and a focus session.

<a href="docs/images/planning-walkthrough-en.gif"><img src="docs/images/planning-walkthrough-en.gif" alt="Break a monthly goal into weekly and daily plans, adjust the timeline and start focusing" width="100%" /></a>

<table>
<tr>
<td width="50%" valign="top">
<strong>Monthly goals</strong><br />
<a href="docs/images/monthly-demo-en.jpg"><img src="docs/images/monthly-demo-en.jpg" alt="Monthly goals" width="100%" /></a>
<br />Set a time budget for each project and allocate it across weeks.
</td>
<td width="50%" valign="top">
<strong>Weekly planning</strong><br />
<a href="docs/images/weekly-demo-en.jpg"><img src="docs/images/weekly-demo-en.jpg" alt="Weekly planning" width="100%" /></a>
<br />Plan around fixed commitments and each day’s availability.
</td>
</tr>
</table>

### One task can span several days

Plan two hours of a six-hour task this week and four hours next week, without creating duplicate tasks. Each session's actual effort stays linked to the original task.

- **Not sure when to start?** Choose a date and estimated duration, leaving the time flexible.
- **Have a specific time in mind?** Switch to the timeline and drag the block to adjust it.
- **Halfway through and need more time?** Re-estimate the remaining work and schedule what is left.
- **Only got part of it done today?** Swipe it to the next day: the original plan stays on today, marked “Partly done; segment ended”, and only the remaining time moves. For example, planned 2 hours and worked 25 minutes leaves 1 hour 35 minutes for tomorrow. (v0.25.9 preview)
- **Didn’t use the focus timer?** When completing, enter either how long it took or from when to when; a from–to range appears at that time on the timeline. Worked in several stretches that day (say, morning and afternoon)? Tap “+” beside the range to add another. (v0.28.2 preview)
- **Moving a task to another day, or recording which day it was done?** Open Edit task: right under the title is “Date”. Choose “Change planned date” or “Record completion”, then tap Today, Tomorrow, Yesterday and so on or pick a date; the button states the result, such as “Move to 11-24” or “Mark done on 11-22”. Changing the planned date moves only the unfinished part (several segments merge into one; segments with no time spent are removed and time already spent stays on its original date). Recording completion sets the completion date and any untimed total together, while focus sessions and entries with start and end times stay on the days they happened. Each item in “Needs rescheduling” can also move to today, tomorrow or a chosen date in one step, and ticking an item whose planned date has passed asks for the completion date, defaulting to the planned day. (v0.26.0–v0.28.1 preview)
- **Have a regular practice you return to?** Keep a reusable entry and add it to a day when needed. Course-related tasks can stay available for a limited phase, too.

Moving future plans does not change past effort. Spending longer than estimated does not automatically mark a task complete. When you explicitly finish the whole task, its unfinished plans close automatically while past effort stays on the dates it happened. You can correct the completion date and the actual date of a legacy time record separately.

Completed tasks keep their original plans on the timeline, shown separately from actual effort. Filter by All, Planned, Actual, Completed or Cancelled; plans cancelled without any effort are hidden by default. When only a total duration was recorded, the plan is marked “Actual start/end not recorded” instead of inventing start and end times. (v0.25.5 preview) A segment with real effort counts as Completed when its task is finished, even if shorter than planned; the day’s Estimated time keeps completed original plans and leaves out cancelled or unexecuted ones. (v0.25.7 preview) When a task is completed with real start and end times (a from–to entry or the focus timer), the timeline shows only the actual time instead of placing it beside the plan; the original plan remains under the Planned filter. (v0.25.10 preview)

Daily lists show both effort on the selected day and the task total, so a multi-day task does not make each day look like the full total. If a historical archive action happened after the actual completion, you can review and correct the completion date separately while preserving effort and the operation timestamp.

### Record progress by activity type

Choose Languages, Learning, Reading, Fitness, Work or Everyday life. Learning includes Personal projects, Skills and Academic study. Classification is separate from project membership: a skills course can still belong to your development project.

Progress forms show the relevant quantities, page checkpoint, course chapters, exercise sets or version outcomes. These details are optional; adding progress does not add time again or complete the task. Switching classification preserves existing links and history, with a warning when they do not match.

Use **Classification review** in Settings to inspect evidence, unresolved records and actual-time totals. Preview changes, download a backup and save. Exportable diffs and selective undo restore classifications without overwriting later time records.

### Record once, see progress where it belongs

When a countdown ends, choose **Resume** to count up from its planned duration—for example, 25:00, 25:01, and so on. Waiting time is excluded. Ending the session records the combined effort once; completing the task remains your choice.

Start a count-up or countdown timer from today's task and enter full-screen focus. Afterward, add the videos you completed, the page you reached, or a project outcome. You can also log progress manually without using the timer. Each task’s buttons are labelled: “Log” opens on “Log time”, where you only enter how long this session took; “Focus” offers 25, 45, 60 and 90-minute shortcuts; “Schedule” starts with one sentence on how much is left and when, with detailed figures on demand; “Edit” and “Tomorrow” edit or defer the task. (v0.28.0 preview)

**An activity's time is counted once.** Daily tasks, learning, reading and projects display linked records. Adding a page number or an outcome does not add another copy of the time.

<table>
<tr>
<td width="50%" valign="top">
<strong>AI assistant</strong><br />
<a href="docs/images/quick-start-en.jpg"><img src="docs/images/quick-start-en.jpg" alt="AI assistant" width="100%" /></a>
<br />Describe a plan and review its draft before saving.
</td>
<td width="50%" valign="top">
<strong>Full-screen focus</strong><br />
<a href="docs/images/focus-demo-en.jpg"><img src="docs/images/focus-demo-en.jpg" alt="Full-screen focus" width="100%" /></a>
<br />A timer alongside a virtual incentive.
</td>
</tr>
</table>

*“Potential wealth” is a virtual incentive that grows with focus time. It is not real income.*

## Choose the modules you need

Scheduling and projects are the core. Add other modules to suit the way you work and live.

| What you want to do | Features |
| --- | --- |
| Follow your learning and course progress | Custom modules and activities, separate time and quantity tracking, weekly, monthly and all-time views; step back to earlier weeks or months with ‹ ›, or click the dates to jump to any week |
| Remember where you left off in a book | A bookshelf, covers, current page and session history, with reading time and progress |
| Build routines and keep moving | Habit, sleep and workout logs, with optional daily intake and nutrition targets |
| Manage everyday spending | Custom accounts, budgets and currencies, with separate totals for each currency |
| See where your time went | Effort trends, project progress and focus history, with sources you can review and correct |
| Back up or take your records with you | JSON backup and restore, task CSV and calendar ICS import/export |

In **Where your time went**, switch between **By category** and **By project** to see actual effort and percentages for the selected period. Categories cover language, learning, reading, fitness, work and everyday life, with unclassified effort shown separately. Switching views keeps the total unchanged. Expand a category or project to review each task’s effort for the selected period, its all-time total and the group subtotal. (Task breakdown: v0.25.3 preview)


<table>
<tr>
<td width="50%" valign="top">
<strong>Learning modules &amp; activities</strong><br />
<a href="docs/images/learning-demo-en.jpg"><img src="docs/images/learning-demo-en.jpg" alt="Learning modules &amp; activities" width="100%" /></a>
<br />Weekly targets, actual time and course counts remain distinct.
</td>
<td width="50%" valign="top">
<strong>Reading room</strong><br />
<a href="docs/images/reading-demo-en.jpg"><img src="docs/images/reading-demo-en.jpg" alt="Reading room" width="100%" /></a>
<br />A bookshelf, reading positions and this month’s effort.
</td>
</tr>
</table>

## Before you start

**Do I need to install anything?**

Open the [web app](https://personal-daily-organize.web.app/?lang=en), or install it on your desktop. Desktop is the primary supported experience. You can continue on a phone, but the mobile layout is still being refined.

**Can friends see my records?**

Each person signs in with their own account and has a separate workspace. Sharing the app link does not share your tasks or notes.

**Does it work offline?**

Initial loading and sign-in require a connection. Cached content is available offline; edits sync when the app is open and connected again. There is currently no cloud scheduler running after the app closes.

**Do I have to use AI?**

No. Manual entry and list input remain available. AI requires a connection and is subject to security verification and service quotas. Review suggested dates, durations and schedules before saving.

**Can I connect WeRead?**

The connection is currently being tested in preview and is not available in the hosted production app. It is intended for read-only cover and reading-progress synchronization, without importing reading time.

**How can I send feedback?**

Use **Settings → Feedback** in the app or open a [GitHub issue](https://github.com/Kylie08ky/daily-in-order/issues). Tell us what you wanted to do and where you got stuck. Remove personal information before attaching screenshots.

## Development and project resources

Designed and maintained by [Kylie](https://github.com/Kylie08ky). Built with React, TypeScript, Firebase and PWA support.

- [Run locally or deploy your own instance](docs/SETUP.en.md)
- [Tests](tests) · [Maintenance and releases](docs/MAINTENANCE.md)
- [WeRead connection guide](docs/WEREAD.md)
- [Demo media notes](docs/images/README.md): screenshots and walkthroughs use sample data, not personal records.

Change the interface language in Settings; your tasks and notes are not automatically translated. A full backup restore replaces the current workspace, so make a backup first.

No open-source license has been selected for this repository. Public source availability does not grant unrestricted redistribution or commercial-use permission. Third-party dependencies and assets retain their respective licenses.

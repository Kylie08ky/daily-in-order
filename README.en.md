<div align="center">

<img src="public/icons/icon-192.png" alt="Daily in Order icon" width="64" />

# Daily in Order · 日常有序

**Make room for your goals. Keep track of the effort behind them.**

An AI-assisted planning and activity workspace, built from everyday personal use.

[Try the app](https://personal-daily-organize.web.app/?lang=en) · [简体中文](README.md) · [Feedback](https://github.com/Kylie08ky/daily-in-order/issues)

React · TypeScript · Firebase · PWA

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

> Current production release: **v0.24.2**, with desktop support prioritized. The hosted app requires registration and email verification. Mobile visitors see a desktop recommendation and can choose to continue.
>
> All eight screenshot sets were refreshed on 2026-11-13 using the local v0.24.2 app and synthetic data only. The PREVIEW label identifies the isolated test environment; click any image to enlarge it. See the [screenshot notes](docs/images/README.md).

## Why I built it

Plans tend to be scattered across calendars, to-do lists, study notes and reading trackers. Taking a task from “something to do this month” to “what I actually spent time on today” means entering the same information in several places. When plans change, past effort can lose its context.

Daily in Order brings that process into one workspace:

**Monthly goals → Weekly allocation → Daily plans → Focus → Progress → Review**

It started as a tool for my own planning habits. Independent accounts, optional modules and multiple languages gradually made it usable by others with different routines.

## See it in action

**One walkthrough, from a monthly goal to today’s focus session.**

Follow the fictional **Creative website** project: set a **12-hour monthly goal** → allocate it across weeks automatically and make adjustments → check daily capacity and schedule **one hour** for the original task → drag its start time on the timeline → start, pause and resume a focus session.

<a href="docs/images/planning-walkthrough-en.gif"><img src="docs/images/planning-walkthrough-en.gif" alt="End-to-end demo: allocate a monthly goal across weeks, schedule a task, adjust its timeline and start focusing" width="100%" /></a>

A roughly 70-second loop. Monthly allocation and weekly scheduling play more slowly, with extra pauses on key results. The current step is labeled at the top. A visible pointer, click rings and drag trails make each action easier to follow; click the animation to enlarge it. Every frame uses a synthetic local test account; static screenshots below make details easier to inspect. Monthly allocations and scheduled sessions are plans, while focus tracks actual effort; they are not added together as actual time.

## Three core experiences

### 01 / Turn a conversation into a plan you can act on

Describe a goal to the AI assistant, review and edit the draft, then confirm to create projects, tasks and schedules. New users can start with a conversation; returning users can reopen the guide whenever they need it.

For example, you could describe a plan like this:

> “I want to finish a course this month. It should take 12 hours. Spread that across the weeks, with more time on weekends. Leave the start times open.”

The assistant supports monthly and weekly planning, reusable tasks, study items and sessions across multiple days. It can also revise the remaining estimate for an existing task. Drafts are plans for review, not invented actual time or completion counts. Manual list entry remains available.

Watch a **real AI generation** create a fictional photography project from one prompt. Review three tasks of 30, 45 and 20 minutes scheduled for tomorrow, then confirm and save. Start times remain optional; the plan does not need to be entered again manually.

![Real AI conversation, project and task drafts, and confirmed creation](docs/images/ai-assistant-walkthrough-en.gif)

About 39 seconds, with a visible pointer and click cues. Recorded in the **English app interface**, using an English prompt and a separate real AI generation for the fictional “Photography Basics - README Demo” project. Generation waits and scrolling are shortened, with longer holds on key results. This is not a scripted AI response.

### 02 / One task, progress across several days

A six-hour task can have two hours planned this week and four next week. All actual effort still belongs to the original task.

- **Flexible scheduling**: choose a date and duration without a required start time.
- **Timeline and list views**: drag scheduled blocks to adjust their timing.
- **Re-estimate remaining work**: see actual time, remaining work and allocated sessions separately.
- **Keep the past intact**: moving future plans does not move recorded effort. Exceeding an estimate does not automatically complete a task.

### 03 / Record the effort and what came out of it

Start a count-up or countdown timer directly from a daily task and enter full-screen focus. Afterward, record actual effort and add video counts, a reading position or project outcomes for the linked activity.

**One activity contributes time only once.** Daily tasks, study items, books and project progress link to the original record. Adding outcomes does not add another copy of the time.

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

The static screenshot above shows the assistant entry in the local emulator without calling cloud AI. The earlier AI walkthrough captures actual generation and saving in preview.

“Potential wealth” grows with focus time as a virtual incentive. It is not real income.

## Build the workspace you need

Scheduling and projects form the core. Users choose which additional modules to enable.

| Module | What it supports |
| --- | --- |
| Monthly and weekly planning | Monthly goals, initial allocation by days in each week, and adjustments around fixed commitments |
| Projects and task pool | Long-term reusable, phase-based reusable and one-off tasks; multi-day execution of one task |
| Learning | Modules and study items; separate time and quantity tracking; weekly, monthly and all-time views with traceable sources |
| Reading | Real book covers, current reading positions and per-session page records |
| Habits and fitness | Habit, sleep and workout logs, with optional daily intake and nutrition targets |
| Finance and budgets | User-defined accounts, budgets and currencies, with totals kept separate by currency |
| Review | Effort trends, project progress and focus history; corrections from source records |
| Backup and exchange | JSON backup and restore, task CSV and calendar ICS import/export |

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

Reading screenshots use fictional books and default cover placeholders; no real WeRead account is connected.

The interface supports **中文 / English / Deutsch**. User-written tasks and notes are not automatically translated.

## Engineering decisions

A central challenge is keeping multiple views connected to the same record while preserving history through ongoing changes.

| Challenge | Approach |
| --- | --- |
| Counting one activity in several modules | Stable IDs link original tasks, effort and outcomes through shared aggregation logic |
| Changes to plans rewriting actual history | Estimates, remaining work, scheduled sessions and actual effort are separate; planning edits retain actual dates and time |
| Offline edits and cloud synchronization | An IndexedDB operation queue, retry handling and conflict resolution preserve pending edits |
| Test data entering production workspaces | Preview and production share authentication identities, but separate workspace, feedback and offline queue namespaces |
| AI drafts changing real records too early | Structured validation and user confirmation; existing domain operations apply changes, while AI never fabricates actual effort |
| Releases that are difficult to trace | Preview first, explicit approval, then promotion of the exact reviewed Hosting version; production history groups changes by release |

**Stack**

- **Interface**: React 19, TypeScript, Vite and Lucide.
- **Accounts and storage**: Firebase Authentication, Cloud Firestore and security rules.
- **AI**: Firebase AI Logic, Gemini and App Check; cloud AI is optionally configured.
- **Offline and installation**: Service Worker, IndexedDB and PWA.
- **Verification**: Node.js tests, Firebase emulators and rules tests, plus build checks.

Explore [app](app), [lib](lib) and [tests](tests) for implementation and verification. Release conventions are documented in [Maintenance](docs/MAINTENANCE.md).

## Run it locally

Requires **Node.js 24.12+, npm and Java 21+**. Development defaults to local authentication and database emulators, without connecting to real user data.

```bash
git clone https://github.com/Kylie08ky/daily-in-order.git
cd daily-in-order
npm ci
npm run emulators
```

In a second terminal:

```bash
npm run dev
```

Open <http://127.0.0.1:52700> and register a synthetic test account. Email verification links appear in the emulator terminal. Emulator data is not retained across restarts by default.

```bash
npm test
npm run test:rules
npm run build
```

[Full setup and deployment guide](docs/SETUP.en.md) · [Maintenance and releases](docs/MAINTENANCE.md) · [WeRead connection](docs/WEREAD.md)

## Current scope

- **Desktop first**: the mobile layout is still evolving and is not the primary support target.
- **Bounded offline support**: initial loading and sign-in need a network. Cached content works offline; edits sync when the app is open and connected again. There is no cloud scheduler running after the app closes.
- **AI needs review**: connectivity, verification and service quotas affect availability. Suggestions do not guarantee a conflict-free schedule; manual input remains available.
- **WeRead is preview-only**: the hosted production service has not enabled the connection. It reads covers and reading progress without importing reading time.
- **Restore carefully**: a full restore replaces the current workspace, so back up first. This public repository contains no user records, personal exports or server credentials.

## About

Designed and iterated by [Kylie](https://github.com/Kylie08ky), starting with everyday needs and refining the experience through feedback.

Use in-app feedback or [GitHub Issues](https://github.com/Kylie08ky/daily-in-order/issues) to share a use case, bug or suggestion. Remove personal information from reports.

The repository does not currently have a selected open-source license. Public source availability does not grant unrestricted redistribution or commercial-use permission. Third-party dependencies and assets retain their respective licenses.

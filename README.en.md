# Daily in Order · 日常有序

**v0.24.1 preview: restore the original timeline layout.** Remove the extra flexible-task box above the home timeline; tasks without a start time remain available in the list. Compact mobile spacing and separate task titles from actions while preserving the green palette, records and statistics. Preview only.

**v0.24.0 preview: easier first steps and feedback.** Days with only flexible tasks default to the list. Local view choices are remembered per account and environment. Planning opens the calendar by default and its task pool starts with all task types. Mobile navigation moves into a top menu so today's tasks come first, with quick AI and feedback access. Completing a task clearly labels cumulative actual time; unset availability no longer appears as zero. Existing records and statistics are preserved. Production has not been updated.


**v0.23.5 preview:** Fix oversized covers, squeezed vertical titles and stretched adjacent cards in the home reading summary; long titles remain readable on mobile.


**v0.23.4 preview:** Task editing and scheduling now share a consistent font, body size and line height, with readable helper text and a distinct heading.


**v0.23.3 preview: scheduling inside the task editor.** Split tasks show remaining sessions with dates, time ranges or Flexible time. Use Adjust schedule in the same window; start times remain optional. Schedule changes save separately while title and note drafts survive returning to the editor. Leaving unsaved schedule edits asks for confirmation. Actual investment, focus records and original dates are preserved.

Make room for your goals. Keep track of the time you put in.

[简体中文](README.md) · **English**

[Try the app](https://personal-daily-organize.web.app/) · [Features](#features) · [Run locally](#run-locally) · [Deploy your own instance](#deploy-your-own-instance)

Daily in Order is a personal workspace with Chinese, English and German interfaces. Plan tasks, track focus sessions and review project progress, then enable learning, reading, habits, fitness and finance modules as needed. The interface uses a green palette and card layouts for desktop and mobile.

This repository contains application source, tests and deployment scripts. It does not include the author's or other users' workspace records, backups, account credentials or production configuration. The hosted app requires your own account; self-hosted installations should use their own Firebase project.

**Current production release: v0.22.0 (2026-11-13).** The owner-approved preview Hosting version was promoted unchanged. Seven preview updates are grouped into one production release entry; production does not show preview change details or pending batches. This includes daily progress recording, concrete project outcomes and historical pages, traceable study time, real book covers, the WeRead interface, remaining-work estimates and separate release histories. Preview and production records remain isolated. The WeRead gateway still allows preview origins only; approval to enable the production origins is pending, so connecting from production is not yet available.

The v0.16–v0.22 entries below are development-time preview notes, now grouped into this release. The production notice above describes the current WeRead gateway limitation.

**v0.22.0 preview: separate release histories.** Settings → About keeps individual preview changes and offers production-history and pending-batch views. Production shows only published batches. The release command pins the reviewed Hosting version and records one batch with the actual publication date after promotion succeeds; retries do not duplicate entries. Publishing never reads or copies user workspaces or test data.

**v0.21.0 preview: re-estimate work in progress.** Open **Split schedule → Adjust remaining work** to replace the entire remaining estimate and distribute it across days or weeks, with optional clock times. Spent time, remaining estimate, scheduled remainder, unallocated work, current total and initial estimate are separate. Saving atomically replaces unfinished plans while preserving task/session IDs, dates, focus and outcomes. Subsequent actual investment reduces the remainder by its delta. Over-allocation blocks saving; ambiguous older sessions require review. Reaching an estimate never completes a task automatically. Slot suggestions remain available. State schema 16 is shared by frontend and cloud-sync codecs; preview data stays separate from production.

**v0.20.0 preview: connect WeRead.** The Reading room adds a connection dialog, e-book selection and explicit linking to existing books. Remote IDs deduplicate updates; real covers and separate percentage snapshots sync without inventing paper page counts, importing time or creating tasks. Personal keys remain in dialog memory only. **The owner’s preview Worker is now deployed and configured, enabling the connection form; production is unchanged.** HTTPS, preview-origin and authentication rejection checks passed; an authenticated request with a synthetic key reached WeRead and returned the expected invalid-key response. Real shelf, cover and progress verification still requires the user to enter their own WeRead key in the UI. Self-hosters must configure their own Worker. [Deployment and data boundaries](docs/WEREAD.md).

**v0.19.0 preview: real book covers.** Every user can search by title, author or ISBN while adding or editing books, then confirm a matching cover. Missing editions support image uploads or URLs. Shelf and home views share the cover without changing reading records.

**v0.18.0 preview: traceable learning time.** Expand a learning activity → **Statistics links / Time sources** to inspect original tasks, actual dates, completion, period contributions and lifetime task time for the week, month or all history. Partially completed tasks with actual investment are listed separately and included. Cross-week sessions follow their original dates; task, focus and learning views do not duplicate time.

Source rows open the original record, correct a session, add a separate investment or preview whole-task reassignment. Legacy unsegmented time explicitly identifies the inherited task date; missing sources are listed for review without inferred dates. Corrections use net differences; total corrections can only explicitly adjust the unsegmented remainder while preserving sessions. Conflicts retain input and the edit history supports undo. Reassignment preserves quantities, pages, dates, completion and focus seconds, without changing templates or tasks on other dates.

**v0.17.0 preview: concrete development projects and accurate reading history.** Add concrete projects beneath a parent project, optionally linked to a reusable entry. Stable IDs retain their names and ongoing/paused/ended status. One investment can contain outcomes for several concrete projects; dated details edit the original outcomes. Unallocated time is labeled “Shared effort” and is never copied per project. Legacy outcomes remain unassigned; renaming or ending a project preserves history.

Reading history shows only each record’s own page checkpoint, or “Session page not entered”; it never falls back to the book’s current progress. “Edit session page” changes only checkpoint fields, preserving the original date, time, focus sessions and completion. Backfilling an earlier record cannot overwrite a later checkpoint. Pages read are derived only from explicit start and end pages.

**Sync compatibility and data protection.** Workspace reads and writes share a parser supporting schemaVersion 1–16. The Firestore chunk envelope remains version 1, a separate protocol. Unsupported formats stop parsing and uploading with an update message, preserving cloud content and the local pending queue without downgrades, resets or old-backup restores. `/version.json` exposes the app/sync versions, supported data format, entry script and SHA-256 for deployment checks; the UI and sync adapter ship in the same build. Production is v0.22.0 (data format 16); preview deployments do not change production or copy user data.

**v0.16.0 preview: record progress directly from Today.** Open the task’s progress icon, or finish a focus session, to enter learning quantities, the current reading page and outcomes for multiple projects. Linked module records open the same editor; when adding a module record, choose an existing task by its actual date. Saving replaces the same record without adding tasks or time. **Correct recorded time** and **Add another session** are separate actions.

- Videos use an incremental quantity: editing 2 to 3 adds only one. Rewatches do not increase completion counts; matching explicit video IDs are deduplicated. Without IDs, content identities are not inferred. Existing course baselines are preserved.
- Reading uses page checkpoints; older backfills do not replace newer progress. Pages read are calculated only with an explicit start and end page. Multiple books can split the original duration without exceeding it. Learning can carry multiple tags, or explicitly allocate minutes to activities with an exact total.
- One development investment can hold multiple project versions, statuses, results and next steps. Project pages show and edit those original outcomes. Time remains on the original task; a milestone does not complete the entire project.
- Historical records can be enriched in place, preserving dates, focus seconds and task IDs. Removing/restoring progress through the new editor does not delete time. Missing quantities or pages are shown as unrecorded. Associations are chosen explicitly, never merged by similar titles.
- Schema 13 stores time-correction history, concrete project IDs and progress linked to original investments, and reads schemas 1–12. Preview and production data remain isolated. This update is not released to production yet.

![Recording reading progress from a daily task (synthetic local data)](docs/screenshots/activity-progress.png)

<details>
<summary>Development history (preview statuses below describe their original stage; these features are now included in v0.15.0)</summary>

**v0.8.2 released:** Switch between Chinese, English and German beside the Settings heading; your choice is remembered on this device. The workspace no longer has a language bar at the top. Navigation scrolls independently, with avatar, name and Settings combined in one bottom entry. Promoted unchanged to production on 2026-11-06 after preview approval, without copying preview data.

**v0.8.3 preview:** Project modules start collapsed while keeping completion counts and progress visible. Click a module heading to expand or collapse it, or use Expand all / Collapse all. Adding a task opens its module. Expansion choices remain while navigating within the current workspace session. Production remains on v0.8.2.

**v0.8.4 preview:** Each project can use recorded time or task progress. Its overall, dashboard and module progress follow the same account-saved choice. Time progress is recorded duration divided by estimated duration for tasks with estimates, capped at 100%; tasks without estimates are excluded, and an empty estimate total prompts you to add estimates. Task progress retains the average task completion percentage. Switching does not change tasks, records or time statistics; older projects default to task progress. Production remains on v0.8.2.

**v0.8.5 preview:** Project header actions use compact horizontal buttons with single-line icon and text labels. With long project names or narrow windows, the action group moves below the heading instead of squeezing buttons into vertical tiles. Production remains on v0.8.2.

**v0.8.6 preview:** Move-up and move-down controls beside each module heading let you reorder all groups, including Unassigned, on desktop and mobile. The order is saved with the project and survives reloads without moving or changing its tasks. Production remains on v0.8.2.

**v0.9.0 preview:** Monthly goals let you select projects, set time budgets and optional outcomes, then split whole minutes proportionally by each week’s in-month days. Adjust weekly amounts or save an unallocated balance. Monthly and weekly tabs distinguish targets, scheduled task estimates and actual time. Schedule existing unscheduled tasks, update tasks in the selected week, add tasks or open the weekly calendar. Actuals reuse focus/manual records and recalculate after edits or deletions; no duplicate tasks are created. Cross-month weeks count only the selected month, and saved plans retain their original week-start setting. Production remains on v0.8.2.

**v0.14.1 preview:** The calendar task pool now has compact project/section filters and counted Ongoing, Stage and One-off category switches. Consistent rows show the title, assignment and duration. Small plus, calendar and more buttons add to today, choose a date and edit the entry, with hover labels. The heading and filters stay in place while the list scrolls; narrow screens retain the same actions. This is a UI-only change; task classifications, records and statistics are unchanged.

**v0.15.0 preview:** The Today list supports swipe left to complete, swipe right to the next day, tap the title to edit, and handle-based reordering. Actions commit on release past a threshold; vertical scrolling remains available. Completion / next-day buttons and Up/Down keys on the handle provide alternatives. Completion keeps the actual-time and reading-page forms. Deferring moves only the selected day’s plans and preserves task identity, actual dates, focus records and progress; completed tasks and the active focus task cannot be deferred. Production remains v0.8.2.

**v0.14.0 preview:** The task pool distinguishes long-term reusable entries, project-stage reusable entries and one-off tasks. Existing templates are reused. The calendar sidebar groups all three and filters by project/section; the permanent-template area lists only long-term entries. Choose a type when creating/editing a task, or reclassify an entry. Add reusable entries to today, choose a date or drag them onto the calendar, then confirm this execution’s duration with an optional start time. Each use creates an independent task retaining project, section and learning-activity links. An existing same-entry task on that day, including a completed one, opens a view/continue option instead of creating a duplicate. Pause, restore and archive preserve past executions. Unused entries do not count toward estimates, pending work or overdue tasks. Promoting an unstarted undated placeholder retains its ID/content as an entry source and excludes it from pending counts. Existing executions, focus records and course quantities are never copied or inferred; existing automatic recurrence rules remain unchanged. Unclassified legacy templates named Hugging Face, Neo4j, AVF K2/K3 or Valeo lectures default to project-stage, others to long-term, with manual reclassification available. Ordinary historical tasks are not bulk-migrated by title. Data schema v10 requires older clients to refresh. Preview only.

**v0.13.0 preview:** Schedule one task across days and weeks: a six-hour estimate can have two hours this week and four next week, always retaining one task ID. Open **Split schedule** from a task’s calendar button, task details or Weekly planning. For an existing full-length plan, adjust its duration first, then add another slot. Start times are optional; total, allocated and unallocated time are shown separately. Move, resize, edit or remove individual slots. Calendar and monthly/weekly scheduled totals use the slots in that date range; focus/manual records still accumulate on the original task, with no invented actual time. Finishing focus replaces only its linked slot; future slots remain. Removing a slot retains actual records. Full JSON backups preserve links; ICS exports individual calendar slots (reimporting ICS is not a relationship-preserving restore). Slots cannot cross midnight. Unlink contained/parallel tasks before splitting; recurring tasks split only the chosen occurrence. Preview data upgrades to schema v9; old v8 clients must refresh, never downgrade writes. Production data remains separate.

**v0.12.0 preview:** Monthly goals and the calendar now share **Plan & calendar**, with Monthly goals → Weekly planning → Calendar. Review unfinished work from last month, choose projects to carry forward with a revised budget, then distribute time by each week’s in-month days and adjust manually. Project cards expose task estimates; weekly planning shows project budgets beside fixed commitments, flexible tasks and remaining daily capacity. Slot suggestions respect fixed events, task deadlines, the chosen time window and daily capacity; nothing is saved until confirmation, and start times remain optional. Daily capacity means total arrangeable time including fixed commitments; remaining capacity subtracts the union of fixed slots and flexible estimates. Use Split schedule to allocate one task across dates, keeping slot durations separate from the total estimate. Production and personal data are unchanged.

**v0.11.0 preview:** Learning now includes Assignments: filter original tasks/logs by project, original title, actual dates and current activity, select records, preview attribution and module/activity time changes, then commit atomically. Task details and learning-log editors offer a separate assignment-only save. Reusable templates and repeat rules can be reassigned; rules also update existing unstarted tasks. Original IDs, dates, actual minutes, focus seconds, completion, notes and course quantities remain intact. Quantity progress stays with its original course; time is deduplicated by task and never uses estimates. Persistent history supports undo, unresolved-assignment filtering and guarded hiding of empty legacy summaries. Changed previews or newer assignments require review rather than overwriting. Preview only; no user data is migrated automatically. Assignment and undo metadata use data schema v8. Earlier data upgrades on read; refresh any older open app tabs before editing further.

**v0.10.1 preview:** Learning modules use compact aligned rows with separate title, time, lifetime quantity and action columns. Labels sit beside their values, with smaller recording buttons. On phones, names and actions share a row and progress sits below. Statistics and saved records are unchanged.

**v0.10.0 preview:** Learning activities now sit inside custom, collapsible modules with editable names and weekly time targets. Activities support separate weekly/lifetime time targets and quantity totals. Week/month/all-time switches scope recorded time; quantity progress stays explicitly lifetime. Focus and manual records roll up without duplicate time. Existing categories, task links and quantities are preserved; historical records are never split by guessed titles. Production is unchanged.

**v0.9.1 preview:** Reading logs now accept the page reached instead of a page increment. Completing a task linked to a book can record the same checkpoint without creating another task or duplicating time; leave it blank to add later. Legacy increments remain compatible, and edits, deletion or restoration recalculate book progress. Production is unchanged.

Learning, reading and workout logs filter linked task choices by the selected date. Changing the date clears an unsaved task selection; editing an existing log preserves its original task link.


</details>

## Screenshots

All six screenshots are displayed directly, with nothing to expand. They show empty sign-in forms or fictional local test accounts, never real user records. [Screenshot notes](docs/images/README.md)

### Quick start (v0.8.0)

AI-assisted setup is shown on the first visit; manual entry and skip remain available. This screenshot uses a synthetic local account and does not show a live AI request.

![Quick start with synthetic local task input](docs/images/quick-start-en.jpg)

### Today

A task list, project progress and daily notes. The v0.8.2 demo screenshot shows the workspace without the top language bar, with independent navigation scrolling and the bottom Settings entry, using synthetic records with lifestyle modules enabled.

![Today dashboard with six synthetic tasks, project progress and fictional daily notes](docs/images/today-demo-en.jpg)

### Daily timeline

Consecutive time records and upcoming plans appear on the same timeline.

![Daily timeline showing consecutive work sessions starting at nine and a later reading plan](docs/images/timeline-demo-en.jpg)

### Full-screen focus

The current task, a countdown and growing virtual rewards.

![Focus timer with the current task, remaining time, virtual growth points and session controls](docs/images/focus-demo-en.jpg)

### Sign-in screen

The English sign-in capture predates the German language selector.

![Daily in Order English sign-in screen with a green palette and personal account access](docs/images/sign-in-en.jpg)

### Daily intake

Chinese UI with illustrative test entries. The nutrition figures are not dietary advice.

![Daily intake screen showing calories, protein, exercise expenditure and meal entries](docs/images/nutrition-demo-zh.jpg)

## Features

| Area | What it does |
| --- | --- |
| Today and calendar | Switch between a list and a daily timeline, drag time blocks, and keep tasks without a fixed start time |
| Projects and task pool | Create projects, break them into tasks, configure repeats and track progress |
| Focus and time records | Count up or down, capture actual start/end times, accumulate multiple sessions, and recalculate totals after editing or removing an individual record |
| Learning and reading | Customize subjects, practice and goals; track time, book pages and reading dates |
| Habits, fitness and intake | Log habits, sleep and training; optionally record meal calories, protein and exercise expenditure |
| Finance and budgets | Configure accounts and budgets; track each currency separately without automatic exchange-rate conversion |
| Review and backup | Review time trends, back up/restore full JSON state, and import/export task CSV and calendar ICS files |
| Onboarding and feedback | Choose modules, set goals, follow a usage walkthrough, submit feedback and see its status |

**v0.23.2 preview: focus history archived by month.** The workspace’s current month is shown by default. Select past months from the archive or return to this month in one click. Days remain collapsible, with bounded session scrolling and seven dates per page. Month summaries cover only the selected month. Archiving is presentation-only: no records are moved or deleted and lifetime statistics stay unchanged.

**v0.23.0 preview: discuss a plan → review the draft → confirm once.** New verified users see Get started with AI; returning users can reopen it from the sidebar or Settings → User guide. Draft projects, monthly targets (allocated by in-month days, with editable weekly minutes), permanent/stage resident entries, learning modules with weekly targets and items with quantity targets, and multiple sessions for one task. Start times are always optional: dated sessions without a clock time are flexible items. Resident entries do not create automatic recurrence; only explicit dates produce occurrences.

To revise ongoing work, first select the **original task** in the optional context section. Review old/new remaining estimates, the open sessions being replaced and unallocated time. The new estimate replaces all remaining work. Confirmation reuses existing domain operations atomically, rejects stale reviews and is idempotent. Original tasks, actual dates/time, focus records and outcomes remain unchanged; AI never writes actual investment, completion or completed video counts. Exact active project names, learning paths and available resident entries are reused locally; similar names are not guessed and course progress is not overwritten. Advanced plans remain editable in their native modules; batch undo remains available only for manual-list project/task creation.

**Users choose what to share.** By default only the request, up to six recent messages and the draft are sent. Selecting an original task adds its title, actual time, remaining estimate and open sessions. Opting into a month adds anonymous calendar occupancy (up to 500 slots), availability and monthly target summaries. Historical learning details, notes, outcomes and finances are excluded. AI suggestions require review and are not guaranteed conflict-free. Manual lists work offline; cloud AI requires a connection. Onboarding now explains month/week planning, three task types, learning items, sessions and remaining work without requiring start times. Preview only until separately approved for production.

Cloud AI also requires Google App Check verification. If a browser fails verification (for example, 403), input is preserved and plain list entry remains available. The app does not bypass verification or switch to a paid provider.

The trial has a **10-attempt daily browser counter per account on each device (UTC)**, including failed attempts. This is not a server-side account quota, abuse control or spending cap; changing devices or clearing storage resets it. Provider free-tier limits also apply. A no-cost trial requires Firebase **Spark with no Cloud Billing account**. Exhausted quotas stop requests; the app never upgrades billing.

To enable AI yourself, follow [Firebase AI Logic setup](https://firebase.google.com/docs/ai-logic/get-started?platform=web) for Gemini Developer API and App Check, then set the three AI variables from `.env.example` in `.env.local`. Restrict the App Check site key to explicitly reviewed preview and production hostnames, never all domains. Before the first production release, verify that the production hostnames are allowed. Never add a Gemini secret key, enable Cloud Functions, or link billing for this feature. App Check policies are project-wide: do not change production enforcement without review. See [free-plan conditions](https://firebase.google.com/docs/ai-logic/pricing) and [Google AI data-use terms](https://ai.google.dev/gemini-api/terms). Emulator projects always disable real AI calls; local tests use synthetic responses.

The default task-drafting model is `gemini-3.5-flash-lite`, which supports no-cost calls; configure it with `VITE_AI_MODEL`.

Run `npm run check:ai` before release. This read-only check verifies that the Firebase App Check, reCAPTCHA Enterprise, Firebase AI Logic and Generative Language APIs are enabled, a site key is configured, and Cloud Billing is not linked. The preview deploy script runs it too. Configuring a reCAPTCHA key alone does not enable the App Check API. Allow service permissions to propagate after enabling an API, then reload and retry. A passing preflight still requires a real browser draft-generation smoke test. Verification, configuration, quota, network/service and invalid-draft failures have separate messages without exposing raw provider responses.

Switch languages in the interface or use `?lang=zh`, `?lang=en` or `?lang=de`. Your task names, notes and book titles are not automatically translated. CSV column headers currently remain in Chinese.

The focus timer's “potential wealth” is a time-based virtual incentive, not real income. Nutrition targets are adjustable reference estimates, not medical diagnosis or treatment.

## Stack

React 19 · TypeScript · Vite · Firebase Authentication · Cloud Firestore · Firebase Hosting · IndexedDB · Service Worker

Business logic lives in `lib/`, with UI components in `app/`. An account-specific local operation queue synchronizes changes with the cloud. Firestore rules require a verified email and restrict workspace access by UID.

## Run locally

Install **Node.js 24.12+, npm and Java 21+**. Java is required by the Firebase emulators. The initial dependency installation and emulator download require a network connection.

```bash
git clone https://github.com/Kylie08ky/daily-in-order.git
cd daily-in-order
npm ci
```

In one terminal, start the local authentication and database emulators:

```bash
npm run emulators
```

In a second terminal, start the app:

```bash
npm run dev
```

Open <http://127.0.0.1:52700>. Development defaults to local emulators and does not require a real Firebase project. The emulator project ID is `demo-friends-isolation`. After registration, the email verification link appears in the emulator terminal; no real email is sent.

Emulator data is not persisted across restarts by default. Export a backup from the app if you want to keep test records.

## Deploy your own instance

1. Create your own Firebase project and Web app. Enable **Email/Password** in Authentication and create a Firestore database.
2. Copy `.env.example` to `.env.local` and enter your Web app's Firebase configuration. Copy `.firebaserc.example` to `.firebaserc` and set `projects.default` to the same project ID. Both actual configuration files are Git-ignored.
3. Check the production and preview hostnames in Authentication's authorized domains. Users must verify their email before accessing their cloud workspace.
4. Sign in to the Firebase CLI, run the checks and deploy a preview.

```bash
npx firebase login
npm test
npm run test:rules
npm run build
npm run deploy:preview
```

`VITE_` variables are included in browser code. Use only public Web client configuration here. **Never put service-account private keys, admin tokens or other server credentials in these variables.** Authentication and Firestore rules enforce access control; hiding the Web API key does not.

`npm run deploy:preview` builds the app, deploys Firestore rules and indexes, and creates or updates the `workbench-review` Hosting channel with a 30-day expiration. **Database rules and indexes are project-wide: changing them also affects production.** Deploy again to renew the preview channel.

After reviewing the preview, promote that exact Hosting build to production:

```bash
npm run release:friends -- --confirm-reviewed-preview
```

This command promotes a Hosting version without rebuilding it or copying workspace records. Deployment requires matching project IDs in `.env.local` and `.firebaserc`. The scripts assume the default Hosting site named after the Firebase project.

For custom production domains, add exact hostnames to the comma-separated `VITE_LIVE_HOSTS` variable and rebuild. Unknown hostnames are rejected rather than assigned a data space.

To intentionally connect local development to your own cloud project, supply its configuration and set `VITE_FIREBASE_EMULATORS=false`. Localhost still uses the preview data space.

### Preview and production data

| Item | Production | Preview |
| --- | --- | --- |
| Workspace records | `users/{uid}` | `previewUsers/{uid}` |
| Feedback | `feedback` | `previewFeedback` |
| Local offline queue | Production namespace | Separate preview namespace |
| Registration and sign-in identity | One Firebase Authentication project | The same project |

The same account can sign in to both environments, while tasks and test records remain separate. Promoting features does not promote preview data. Preview initialization enables optional modules for testing; production users choose their modules during onboarding.

To manage all users' feedback, create a `feedbackAdmins/{uid}` document in the Firebase console with the boolean field `enabled: true`. The admin must still verify their email. Clients cannot grant themselves this permission.

## Offline behavior and data

- First load, registration and sign-in require a network connection. Cached pages and loaded records can be used offline; changes synchronize when the app is open and connectivity returns.
- On iPhone, use Safari's **Share → Add to Home Screen**. Desktop browsers with PWA support can also install the app.
- There is no cloud scheduler running while the app is closed. Recurring arrangements are processed when the app opens.
- Clearing site data, storage eviction or device loss can affect unsynchronized records. Export JSON backups regularly.
- A full restore replaces the current workspace; back it up first. CSV and ICS are exchange formats, not full backups. ICS import supports the common recurrence rules implemented in the app, not every calendar feature.
- This is an actively evolving personal project. The repository's tests describe the tested scope; review dependencies and your deployment configuration before running a public service.

## Maintenance and release workflow

Future feature changes follow this workflow without a separate reminder to synchronize GitHub:

1. **Implement and verify**: complete the relevant code and checks while preserving existing records and preview/production data isolation.
2. **Synchronize GitHub and both READMEs**: review `README.md` and `README.en.md` for every feature change, update affected descriptions, instructions and images in both languages, then commit and push to this repository.
3. **Deploy to preview first**: provide the preview URL and a change summary for the project owner to test. A GitHub push does not automatically deploy the website.
4. **Promote only after confirmation**: release the exact reviewed Hosting version only after the project owner explicitly approves the current preview. Further feature changes require another preview and confirmation.

Releases update application functionality; they do not copy test data or overwrite user records. Documentation-only or README-image changes are pushed to GitHub without a website deployment. Database rule/index changes require a separate check of their production impact.

See [Maintenance and releases](docs/MAINTENANCE.md) for the full agreement. Coding assistants and maintenance tools should read [AGENTS.md](AGENTS.md) first.

## Project structure and checks

```text
app/                 Pages, components and styles
lib/                 Models, business logic, sync, languages and metrics
src/                 Entry point and authentication styles
public/              Icons, scene images and PWA manifests
scripts/             Build checks, preview deployment and promotion
tests/               Business logic and data isolation tests
tests/emulator/      Firebase rules and persistence tests
firestore.rules      Data access rules
firebase.json        Hosting and local emulator configuration
```

```bash
npm test              # Business logic and local data tests
npm run test:rules    # Rules and isolation checks in local emulators
npm run build         # Type checks, bundle, offline cache and artifact audit
```

Tests use emulators or test data and do not require production accounts. Do not commit `.env.local`, `.firebaserc`, user exports, logs, service-account files or deployment credentials.

## Feedback and licensing

Use [GitHub Issues](https://github.com/Kylie08ky/daily-in-order/issues) for bugs and suggestions. Remove personal information from screenshots and reproduction material before posting.

No project-wide license has been selected yet. Public availability does not grant unrestricted redistribution or commercial-use rights. Third-party dependencies and assets remain subject to their respective rights and license terms.

### Real book covers (preview)

When adding or editing a book, search Open Library by title, author or ISBN and select the matching cover; ISBN helps identify the edition. The shelf, continue-reading card and home overview use the same cover without changing pages, reading time or history. Catalog coverage varies across languages and editions: upload JPG / PNG / WebP (up to 10 MB, compressed and synced with your account) or paste an HTTPS image URL when no match is found. Missing or failed covers use a neutral text placeholder, never a fabricated cover. Only search text is sent to the catalog, not tasks or reading history. Search and remote images require connectivity. Source: [Open Library APIs](https://openlibrary.org/dev/docs/api).

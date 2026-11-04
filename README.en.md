# Daily in Order · 日常有序

Make room for your goals. Keep track of the time you put in.

[简体中文](README.md) · **English**

[Try the app](https://personal-daily-organize.web.app/) · [Features](#features) · [Run locally](#run-locally) · [Deploy your own instance](#deploy-your-own-instance)

Daily in Order is a personal workspace with Chinese, English and German interfaces. Plan tasks, track focus sessions and review project progress, then enable learning, reading, habits, fitness and finance modules as needed. The interface uses a green palette and card layouts for desktop and mobile.

This repository contains application source, tests and deployment scripts. It does not include the author's or other users' workspace records, backups, account credentials or production configuration. The hosted app requires your own account; self-hosted installations should use their own Firebase project.

## Screenshots

English sign-in page:

![Daily in Order English sign-in screen with a green palette and personal account access](docs/images/sign-in-en.jpg)

<details>
<summary>View the daily intake module (local test data, Chinese UI)</summary>

![Daily intake screen showing calories, protein, exercise expenditure and meal entries](docs/images/nutrition-demo-zh.jpg)

</details>

These are actual app screenshots of an empty sign-in form or a local test account, with no real user records. Nutrition figures are illustrative only. The English sign-in capture predates the German language selector. [Screenshot notes](docs/images/README.md)

### Today, timeline and focus timer

These screenshots use fictional accounts and tasks in local Firebase emulators. No real user records were imported, read or displayed. Optional lifestyle modules are disabled in this demo to highlight scheduling and projects.

<details>
<summary>Today: a task list, project progress and daily notes</summary>

![Today dashboard with six synthetic tasks, project progress and fictional daily notes](docs/images/today-demo-en.jpg)

</details>

<details>
<summary>Daily timeline: consecutive time records and upcoming plans</summary>

![Daily timeline showing consecutive work sessions starting at nine and a later reading plan](docs/images/timeline-demo-en.jpg)

</details>

<details>
<summary>Full-screen focus: a countdown and growing virtual rewards</summary>

![Focus timer with the current task, remaining time, virtual growth points and session controls](docs/images/focus-demo-en.jpg)

</details>

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

Start small: **create a project → add a task → assign a date or time → focus or log progress → review your activity**.

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

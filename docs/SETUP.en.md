# Local development and deployment

[Back to the project](../README.en.md) · [简体中文](SETUP.md)

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
2. Copy [`.env.example`](../.env.example) to `.env.local` and enter your Web app's Firebase configuration. Copy [`.firebaserc.example`](../.firebaserc.example) to `.firebaserc` and set `projects.default` to the same project ID. Both actual configuration files are Git-ignored.
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

## Optional: cloud AI

Real AI requests are always disabled for local emulator projects. For your own deployment, configure the Gemini Developer API and App Check following the [Firebase AI Logic guide](https://firebase.google.com/docs/ai-logic/get-started?platform=web), then set these values in `.env.local`:

```dotenv
VITE_AI_ENABLED=true
VITE_AI_MODEL=gemini-3.5-flash-lite
VITE_APPCHECK_SITE_KEY=your_public_site_key
```

The model above is the repository's current default and can be changed through `VITE_AI_MODEL`. Model availability, quotas and data terms are controlled by the provider; consult [Firebase pricing](https://firebase.google.com/docs/ai-logic/pricing) and [Google AI data terms](https://ai.google.dev/gemini-api/terms). Never put a private Gemini key in frontend environment variables.

- Restrict the App Check reCAPTCHA Enterprise site key to explicitly reviewed preview and production domains. Do not allow all domains. Check production domains before the first live release.
- This project's trial workflow requires Spark with no linked Cloud Billing account. It does not automatically upgrade or switch to a paid endpoint. App Check settings are project-wide; review their production impact before changing them.
- Run `npm run check:ai` for read-only API, site-key and billing checks. A passing check still requires generating a draft in a real browser. Do not bypass verification.
- A browser counter allows 10 attempts per device, account and UTC day, including failures. It is not a server-side rate limit, abuse control or spending cap; clearing storage or switching devices resets it. Public deployments need a separate assessment of server-side quotas and abuse protection.
- By default, requests include the current input, the last six messages and the draft. Selecting an original task or reference month adds the corresponding planning context, not the full workspace, finances or historical notes. Drafts require review before saving and never fabricate actual effort or completion counts.
- Verification and generation failures preserve the input and allow manual list entry, which does not depend on cloud AI.

## Optional: book covers and WeRead

When adding or editing a book, users can search online by title, author or ISBN and confirm a cover. Image uploads and image URLs are alternatives when the correct edition is unavailable. Similar titles do not automatically overwrite existing books.

WeRead requires a separately deployed read-only bridge and `VITE_WEREAD_GATEWAY`. See [WEREAD.md](WEREAD.md) for deployment, allowed origins and credential handling. No reusable personal connection credentials are included in this repository.

## Offline behavior and data

- First load, registration and sign-in require a network connection. Cached pages and loaded records can be used offline; changes synchronize when the app is open and connectivity returns.
- On iPhone, use Safari's **Share → Add to Home Screen**. Desktop browsers with PWA support can also install the app.
- There is no cloud scheduler running while the app is closed. Recurring arrangements are processed when the app opens.
- Clearing site data, storage eviction or device loss can affect unsynchronized records. Export JSON backups regularly.
- A full restore replaces the current workspace; back it up first. CSV and ICS are exchange formats, not full backups. ICS import supports the common recurrence rules implemented in the app, not every calendar feature.
- This is an actively evolving personal project. The repository's tests describe the tested scope; review dependencies and your deployment configuration before running a public service.

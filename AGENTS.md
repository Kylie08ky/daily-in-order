# Daily in Order maintenance instructions

Read [docs/MAINTENANCE.md](docs/MAINTENANCE.md) before changing functionality or publishing.

## Standing owner instructions

- Keep feature code synchronized with `https://github.com/Kylie08ky/daily-in-order`. Commit and push completed, verified changes as part of the task; do not wait for a separate synchronization request. Never include unrelated work, credentials, real user records or production configuration.
- Review both `README.md` (Chinese) and `README.en.md` (English) for each feature change. Update affected descriptions, setup steps and screenshots together; unchanged instructions need no cosmetic rewrite. Explain any blocked synchronization rather than claiming completion.
- Deploy feature changes to the `workbench-review` preview channel first and give the owner the preview URL and change summary. Do not update the live Hosting channel until the owner explicitly approves that current preview.
- After approval, use `npm run release:friends -- --confirm-reviewed-preview` to promote the reviewed version as-is. Do not rebuild or include newer unreviewed changes during promotion. If the reviewed version has expired, redeploy it to preview and obtain confirmation again.
- A GitHub push is not approval for production. Do not add automatic production deployment workflows that bypass this gate.
- Documentation-only and README-image changes need a GitHub update, not a site deployment.

## Verification and data boundaries

- For functionality changes, run the relevant tests plus `npm test`, `npm run test:rules` and `npm run build` before preview deployment. Use local emulators with `demo-friends-isolation`; never use production records as test fixtures.
- Preview and live share Authentication identities but use separate workspace, feedback and offline queue namespaces. Never copy preview test data into production during a release.
- Firestore rules/indexes are project-wide even during preview deployment. Review compatibility and isolation before changing them; a preview URL does not isolate backend policy changes.
- Keep this public repository configurable via `.env.local` and `.firebaserc`. Neither actual configuration file, service-account credentials, logs, backups nor Firebase CLI tokens belongs in Git.
- Use only empty forms or synthetic local test accounts for public screenshots. Inspect images before committing them and keep both README links valid.
- If a task changes the app in a separate deployment checkout, deliberately port the corresponding source changes here while preserving this repository's generic configuration. Do not overwrite another checkout or copy it wholesale.

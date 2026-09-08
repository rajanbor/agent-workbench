# Changelog

## 0.1.0-alpha.3

- Connect GitHub through the official GitHub CLI and choose an accessible personal, organisation or collaborator repository from the app.
- Import private repositories through the main account's macOS Keychain without exposing credentials, `origin` or Git credential configuration to the agent account.

## 0.1.0-alpha.2

- GitHub Pages download page with one universal macOS `.pkg` for Apple Silicon and Intel.
- Native macOS Installer installs the app into /Applications without privileged scripts.
- In-app first-run guide opens account/tool setup and provider login without typed commands.
- User-scoped launcher is prepared and updated when the installed app starts.
- CI installs the universal package on a disposable Mac and verifies its bundled setup.

## 0.1.0-alpha.1

- Native macOS project browser and shared Swift CLI.
- Codex/Claude/terminal launch under a separate standard agent account.
- Canonical workspace checks, independent Git copies and tracked sessions.
- Explicit startup errors, SIGTERM stop, non-secret environment variables.
- Preview-first macOS setup, user-local app and agent-tool installers.
- Apache-2.0, security policy and CI on Apple Silicon and Intel.

Known limits: no enforced network sandbox, no automatic Lando query, no
notarization, no guarantee of stopping daemonized descendants, no independent
security audit. Interactive login and macOS consent remain user-controlled.

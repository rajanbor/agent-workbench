## Install without ZIPs or shell commands

Open **[the download page](https://rajanbor.github.io/agent-workbench/)**, download
**AgentWorkbench-macos-universal.pkg**, and follow macOS Installer.
One installer supports Apple Silicon and Intel on macOS 14+.

Open **Applications → Agent Workbench → Skonfiguruj Maca**. The app opens the
guided account/tool setup in Terminal. Answer the prompts; no commands to type.
Use **Zaloguj Codex** / **Zaloguj Claude** to log in, then add a project.

The installer only adds the app to /Applications and runs no privileged scripts.
The app prepares its user-scoped launcher automatically. Account creation and
permission changes remain explicit choices in the first-run guide.
Existing agent accounts, passwords, projects and settings are preserved.

## GitHub import

Choose **Dodaj projekt → GitHub** inside the app, connect through the official
GitHub CLI browser login, select an accessible repository, then click **Dodaj
repozytorium**. The import supports private repositories and creates a new
isolated local workspace. GitHub credentials, `origin` and credential helpers
do not reach the `agent` account. GitHub CLI is required and the UI links to its
official download if it is missing.

If upgrading from a manual install in ~/Applications, open the new copy from
/Applications. The older ZIP/source workflow remains available for developers.

[Polska instrukcja](https://github.com/rajanbor/agent-workbench/blob/main/docs/QUICKSTART.pl.md)

## Validation and alpha limitations

CI tests the app on Apple Silicon and Intel, builds the universal installer,
installs it on a disposable Mac, verifies both executable architectures and
signatures, and checks the launcher and bundled setup entry points.

The app is ad hoc signed; the installer is unsigned and not notarized by Apple.
Review macOS Privacy & Security prompts yourself. No independent security audit,
enforced network sandbox, or automated provider login test.

Report vulnerabilities using GitHub private vulnerability reporting.

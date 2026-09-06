Native macOS GUI and CLI for Codex/Claude running as a separate standard account.

## Install

Download the ZIP for your Mac (arm64 = Apple Silicon, x86_64 = Intel) and
the corresponding .sha256 file. Verify the checksum, extract the ZIP,
open Terminal in the AgentWorkbench folder, and run:

```sh
bash scripts/quickstart.sh
```

The guide installs the app and CLI, offers standard-account creation and HOME
protection, and installs tools in agent HOME. Passwords stay with macOS.
Setup changes require explicit responses. Use --dry-run to preview the guide.

[Polska instrukcja](https://github.com/rajanbor/agent-workbench/blob/main/docs/QUICKSTART.pl.md)

## Alpha limitations

Ad hoc signed, not notarized by Apple. Review macOS Privacy & Security prompts
yourself. No independent security audit, enforced network sandbox, or automatic
Lando query. Profiles are informational. CI verifies UID switching and workspace
access on disposable macOS accounts; real provider login is not automated.

Report vulnerabilities using GitHub private vulnerability reporting.

# Agent Workbench

[![CI](https://github.com/rajanbor/agent-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/rajanbor/agent-workbench/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![Status: alpha](https://img.shields.io/badge/status-alpha-orange.svg)](CHANGELOG.md)

A native macOS app and CLI for running **Codex and Claude Code as a separate
standard macOS user**. Local projects, explicit permissions, native Metal access.
No VM, Electron, cloud backend, telemetry, or bundled agent credentials.

[Polski: instalacja krok po kroku](docs/QUICKSTART.pl.md) ·
[Download alpha](https://github.com/rajanbor/agent-workbench/releases/tag/v0.1.0-alpha.1) ·
[Security model](docs/SECURITY.md)

> Experimental alpha, not independently security-audited. A separate account is
> the boundary; actual macOS permissions determine access. Safe/Network profiles
> are informational. Read the security model before running untrusted code.

## Quick start

Requires macOS 14+ and a main account authorized to use sudo. Apple Silicon and
Intel builds are provided. Agent tools require their own provider login.

1. Download the matching ZIP and its `.sha256` file from
   [Releases](https://github.com/rajanbor/agent-workbench/releases/tag/v0.1.0-alpha.1).
   Verify with `shasum -a 256 -c AgentWorkbench-macos-arm64.zip.sha256`
   (use `x86_64` for Intel), then unzip.
2. Open Terminal in the extracted `AgentWorkbench` folder.
3. Run the guided setup:

```sh
bash scripts/quickstart.sh
```

The guide installs the app into `~/Applications`, installs `agentctl` into
`~/.local/bin`, then asks before creating an account, granting workspace access,
restricting the main HOME or installing agent tools. Existing account passwords
and existing projects are preserved. Passwords are handled by sudo/sysadminctl.

Builds are ad hoc signed, **not notarized**. macOS may require you to review the
download in System Settings → Privacy & Security → Open Anyway. We do not
disable Gatekeeper or remove quarantine attributes. Apple Events consent for
Terminal/iTerm is also handled by macOS.

For a read-only preview:

```sh
bash scripts/quickstart.sh --dry-run
```

## Build from source

Requires Swift 6 / Xcode 16 or newer (a compatible Command Line Tools install
also works). Install Apple's tools with `xcode-select --install` if missing and
finish the system installer before continuing.

```sh
git clone --branch v0.1.0-alpha.1 https://github.com/rajanbor/agent-workbench.git
cd agent-workbench
bash scripts/quickstart.sh
```

Build without installing or changing the machine:

```sh
swift test
bash scripts/build-app.sh
```

## Separate setup steps

Each script can be reviewed and run independently:

```sh
bash scripts/install.sh --dry-run
bash scripts/install.sh
bash scripts/setup-macos.sh                 # preview only
bash scripts/setup-macos.sh --apply         # prompts before each change
bash scripts/install-agent-tools.sh         # preview only
bash scripts/install-agent-tools.sh --apply
open "$HOME/Applications/Agent Workbench.app"
```

The setup creates standard `agent` only if missing, uses
`/Users/Shared/AgentWork`, and offers a targeted ACL denying that account access
to your main HOME. It does not grant admin, sudo, Docker access or Full Disk
Access; it does not copy credentials or change sudoers. Do not sign the agent
account into iCloud.

Agent tools install under `/Users/agent/.local`. The script installs a
checksum-pinned Node release if required, uses a user-local npm prefix, and adds
one PATH line to **agent's** `.zprofile`. It never runs `sudo npm`.

Log in to your providers separately:

```sh
sudo -iu agent
codex login
claude
exit
```

See [OpenAI's CLI guide](https://developers.openai.com/codex/cli/) and
[Anthropic's installation guide](https://code.claude.com/docs/en/installation).

## Use

Add an existing directory inside AgentWork, or choose a trusted source repository
and preview an isolated copy. Select the project and click Codex, Claude or
Terminal. The terminal explains its sudo password prompt; startup errors also
appear in the project panel.

```sh
~/.local/bin/agentctl list
~/.local/bin/agentctl status
~/.local/bin/agentctl add /absolute/path/to/trusted-repository
~/.local/bin/agentctl codex example
~/.local/bin/agentctl claude example
~/.local/bin/agentctl open example
~/.local/bin/agentctl sessions example
~/.local/bin/agentctl stop example
~/.local/bin/agentctl remove example
```

If you already have another `agentctl`, the installer refuses to overwrite it.
The installed runtime CLI is also available at
`/Users/Shared/AgentWorkbench-<main UID>/agentctl`.

## How isolation works

A normal Git worktree in a private source repository still depends on that
repository's `.git`. Our creator makes an independent bare clone with
`--no-local`, removes its source remote, then creates a worktree from that copy.
Only committed history is imported; uncommitted files, credentials and source
configuration are not copied. There is no automatic merge/sync back to source.

Launches switch UID through `sudo -iu agent` with a clean environment.
Canonical paths and private-directory access are checked again as agent.
Git status also runs as agent because Git filters can execute repository code.
The main-owned launcher is not setuid and has no privileged service.

## Known limits

- No enforced network/per-project sandbox. Other agent-readable files remain
  readable; localhost services may expose data. Lando status is not queried.
- `sudo -n` diagnostics report Unknown without authorization. Run `sudo -v`
  then `agentctl status` in the same terminal. GUI authorization may differ.
- Session state is advisory. Stop sends SIGTERM to the supervisor's own child
  group; daemonized descendants may remain. No automatic SIGKILL.
- `remove` confirms and archives direct workspace children, retaining source
  repositories and isolated Git metadata. It does not permanently delete them.
- Import assumes a trusted source and no concurrent manipulation of destinations.
  This alpha does not promise protection against every filesystem race.

## Project

[Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) ·
[Report vulnerabilities privately](SECURITY.md) · [Changelog](CHANGELOG.md)

Apache-2.0 © 2026 Rajan Bor and contributors.
Independent project; not affiliated with Apple, OpenAI or Anthropic.

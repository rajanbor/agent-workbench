# Architecture

Swift Package, macOS 14+, no third-party dependencies:

- `WorkbenchCore`: Codable configuration, workspace/metadata validation, shared actions, repository creator, diagnostics, terminal command construction, sessions and one controlled `ProcessRunner`.
- `AgentWorkbench`: native SwiftUI sidebar, project table, diagnostics/setup, project creation preview, environment/profile editor and session Stop.
- `agentctl`: thin CLI frontend over the same core. Internal `__run` verifies a main-owned request before executing under the non-root `agent` account.

## Launch path

GUI/CLI → immutable main-owned request file → AppleScript argv → Terminal.app or iTerm → short `agentctl start <UUID>` command → POSIX spawn of sudo with a clean environment → `sudo -iu agent` → `env -i` with explicit agent HOME/PATH → agent login zsh → `agentctl __run` validates UID, private access and canonical cwd → supervisor → agent child.

Launch requests live under main-owned `requests`, separate from agent-writable session status. Request files, their directory and the runtime must have the expected owner, no group/other write bits, no symlinks and no extended ACL. Startup failures are written to session state and shown in the GUI. The terminal explains the password prompt before sudo runs.

Terminal handles sudo authentication directly. No application password collection or privileged helper daemon. The shared executable is not setuid and has no entitlements granting additional access. Apple Events consent is left to macOS.

Supervisor uses `posix_spawn`, a separate child process group, foreground terminal ownership, and `waitpid`. It sends SIGTERM only to its unreaped child group on a stop request. PID reuse cannot redirect a stop to an unrelated process. Heartbeat files are for display, not authority. Repository tools have normal terminal input/output.

## Storage

- Main account: `~/Library/Application Support/AgentWorkbench/config.json`, mode 600 in directory 700. Atomic writes; single-writer usage expected (concurrent GUI/CLI updates can overwrite each other).
- Workspace: `/Users/Shared/AgentWork` and private Git metadata under `.repositories`.
- Main-owned public runtime: `/Users/Shared/AgentWorkbench-<main UID>/agentctl`, mode 755 without extended ACLs.
- Per-session directory: ACL for agent to publish heartbeat/read Stop; does not grant access to the executable or main HOME.
- Removed workspaces: recoverable archive under runtime `removed`, mode 700; moves use directory descriptors and `renameat`.

Longer GUI operations run outside the main actor. Foundation Process execution and POSIX process spawning are centralized in ProcessRunner. Git diagnostics run under agent UID; clone/import executes from an explicitly selected trusted source. Permissions are granted only on the newly created repository copy/worktree.

## Deliberate MVP boundaries

No background privileged service; no enforced per-project or network sandbox; no automatic Lando query; no global process discovery; no credential migration; no automatic Git remote authentication or merging back to source. Sudo diagnostics can remain Unknown until a suitable authentication context exists. Build output is locally ad hoc signed, not notarized for distribution.

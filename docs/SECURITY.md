# Security model

## Boundary

The security boundary is the macOS UID of a separate standard account, `agent`. Changing cwd is not a security boundary. Every launched shell, Codex and Claude process switches account using sudo; the supervisor verifies UID again. Root, the GUI UID, and accounts in admin/wheel are refused. The application adds no sudoers rules, sudo rights, Docker groups, Full Disk Access, Keychain entitlements or credential copies.

The agent can read **everything that macOS permits the account to read**, including world-readable files, files accessible via the staff group or ACLs, mounted volumes and other workspaces. A separate account is not a VM, chroot, per-project sandbox or network firewall. GPU/Metal and physical memory remain native; the app imposes no VM memory cap.

## What is enforced

- Absolute existing directory paths; traversal components and NUL are refused.
- `realpath` containment with a path-separator boundary; workspace root itself, sibling prefixes and symlink escapes are refused.
- `.git` and worktree common metadata must remain in the workspace. External private worktrees must be imported as independent copies.
- Physical cwd is checked again after account switching and before child startup.
- Launch command arguments are shell-quoted; AppleScript receives the command as argv. No eval.
- Caller environment is cleared before sudo and before the agent login shell. Only explicit agent HOME/PATH and terminal basics are supplied. Agent-owned login files can load the agent's own credentials.
- Project environment allows only NODE_ENV, PORT, TZ, LANG, LC_ALL and CI. These are plain-text non-secret settings; a user can still manually put sensitive text in any allowed value, so do not do that.
- Known SSH, AWS, config, Documents, iCloud and Keychain directories are checked as agent before launch. Read/search access blocks launch. Common Docker sockets are checked for write access. These are conservative probes, not an exhaustive audit.
- Stop asks a live supervisor to signal its own child group with SIGTERM. No PID loaded from disk is used for kill. No automatic SIGKILL.

## What is not enforced

There is no Safe-profile network isolation. Both profiles can reach internet and localhost subject to ordinary OS rules. Services on localhost can expose private data, Docker APIs, development servers, model servers or credentials. Do not run unauthenticated sensitive listeners accessible to the agent. The app never grants Docker socket access, but cannot prove there is no TCP Docker endpoint or alternate socket.

The app cannot prove the absence of customized sudoers policies, all supplementary-group privileges, TCC grants, readable credentials in arbitrary paths, or malicious account startup scripts. Admin-group absence is reported as group membership, not a complete privilege audit. An access result of Unknown is not a claim of protection. Files readable to staff/everyone remain readable until the owner deliberately changes permissions. **Do not assume this Mac is fully hardened because the app builds.**

Validation is repeated but does not implement a kernel-enforced filesystem jail. A malicious agent can rename directories, race path operations, create symlinks after launch, read other accessible projects, alter session status, and edit its own startup files. Project isolation here means isolation from private main-account data by existing OS permissions, not isolation between agents. Runtime files remain protected from agent writes. Session heartbeat content is advisory and can be forged; it does not confer signal authority.

Import operates on a trusted source selected by the main user. Do not import an untrusted repository with malicious source-side Git configuration or manipulate workspace destinations concurrently during creation. Hooks/credentials/global Git config are not copied. Git status on agent-owned projects runs as agent, since Git filters can execute commands.

## Docker, SSH and authentication

Docker daemon control often permits mounting and editing host data, defeating the account boundary. The app never shares the socket, adds a Docker control group or relays Docker commands. Run Lando manually as the main account when needed; mounting agent-editable code in a privileged development container is a separate trust decision.

Main-account SSH keys, AWS config, GitHub CLI auth, provider keys and Keychain entries are never copied. Authenticate Codex/Claude separately as agent if needed. The app does not log secret values or offer its own password manager. Git push and remote credential forwarding are intentionally absent.

## Setup review

Use `agentctl status`; if sudo requires authentication, run `sudo -v` and retry in the same terminal. Review access warnings before launch. Creating/changing account privileges, restricting private directory permissions and approving macOS consent remain explicit user actions. This project does not execute administrator-password operations during development.

Suggested read-only manual checks in your terminal:

```sh
id agent
sudo -iu agent id
sudo -iu agent /bin/zsh -lc 'command -v codex; command -v claude'
sudo -l -U agent  # inspect policy yourself; may require administrator authentication
ls -lde "$HOME" "$HOME/.ssh" "$HOME/Documents" /Users/Shared/AgentWork
```

Do not blindly apply recursive chmod to HOME: macOS ACLs, collaboration and existing services may require deliberate choices. No instructions here require copying private credentials, bypassing TCC prompts or configuring NOPASSWD.

## Account-specific HOME access restriction

If startup reports that agent can access your private directories, a targeted option is denying that account listing/search on your main HOME. Review and run this yourself **from the main account**:

```sh
chmod +a "user:agent deny list,search" "$HOME"
```

This prevents agent from traversing that entire HOME, including projects stored there. The launcher and workspaces must stay under `/Users/Shared`. Other account entries are preserved; this is not recursive chmod. To undo this exact entry:

```sh
chmod -a "user:agent deny list,search" "$HOME"
```

Restart an agent session to repeat the real access checks. This app never applies this change automatically.

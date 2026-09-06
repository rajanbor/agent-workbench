#!/bin/bash
# Preview by default. --apply asks before security-sensitive changes.
set -euo pipefail
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
apply=false
for option in "$@"; do
    case "$option" in
        --apply) apply=true ;;
        --dry-run) apply=false ;;
        --help) printf 'Usage: bash scripts/setup-macos.sh [--apply | --dry-run]\nDefault: read-only preview. Run from your main macOS account.\n'; exit 0 ;;
        *) echo "Unknown option: $option" >&2; exit 1 ;;
    esac
done
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS is required.' >&2; exit 1; }
main_user="$(id -un)"
main_uid="$(id -u)"
[[ "$main_uid" != 0 && "$main_user" != agent ]] || { echo 'Run as your main account, without sudo.' >&2; exit 1; }
main_home="$(dscl . -read "/Users/$main_user" NFSHomeDirectory | sed 's/^NFSHomeDirectory: //')"
[[ "$main_home" == "$HOME" && "$main_home" == /Users/* && ! -L "$main_home" ]] || { echo 'Unexpected main HOME; use the manual setup guide.' >&2; exit 1; }
workspace=/Users/Shared/AgentWork
confirm() {
    local answer
    printf '\n%s Type YES to continue: ' "$1"
    read -r answer
    [[ "$answer" == YES ]]
}
echo 'Agent Workbench — macOS setup'
printf 'Main account: %s\nWorkspace: %s\n' "$main_user" "$workspace"
echo 'No sudoers changes, administrator rights for agent, credential copies, or Docker access.'
if ! id agent >/dev/null 2>&1; then
    echo 'Plan: create standard account agent, HOME /Users/agent, shell /bin/zsh.'
    echo 'macOS will prompt for administrator authorization and a NEW password for agent.'
    if $apply && confirm 'Create the agent account?'; then
        # A dash delegates password input to sysadminctl; passwords never enter shell variables.
        sudo /usr/sbin/sysadminctl -addUser agent -fullName "Coding Agent" -home /Users/agent -shell /bin/zsh -password -
        id agent >/dev/null 2>&1 || { echo 'Account creation failed. Use System Settings > Users & Groups.' >&2; exit 1; }
    fi
else
    echo 'Existing agent account will be preserved; its password will not be changed.'
fi
if id agent >/dev/null 2>&1; then
    [[ "$(id -u agent)" != 0 && "$(id -u agent)" != "$main_uid" ]] || exit 1
    for group in $(id -Gn agent); do
        [[ "$group" != admin && "$group" != wheel ]] || { echo 'Agent is an administrator. Review account settings; setup refused.' >&2; exit 1; }
    done
    agent_home="$(dscl . -read /Users/agent NFSHomeDirectory | sed 's/^NFSHomeDirectory: //')"
    [[ "$agent_home" == /Users/agent && ! -L "$agent_home" ]] || { echo 'Unexpected agent HOME; setup refused.' >&2; exit 1; }
elif $apply; then
    echo 'Create agent before preparing the workspace.' >&2
    exit 1
fi
[[ ! -L "$workspace" ]] || { echo 'Workspace must not be a symlink.' >&2; exit 1; }
if [[ -e "$workspace" ]]; then
    [[ -d "$workspace" && "$(stat -f %u "$workspace")" == "$main_uid" ]] || { echo 'Workspace must be a directory owned by your main account. No ownership was changed.' >&2; exit 1; }
fi
echo 'Plan: create workspace if missing; add inheritable access for agent and the main account.'
echo 'Existing workspace content and permissions are preserved; no recursive permission changes.'
if $apply && confirm 'Prepare this workspace and grant agent access to it?'; then
    if [[ ! -d "$workspace" ]]; then (umask 077; mkdir -m 1700 "$workspace"); fi
    chmod +t "$workspace"
    for account in agent "$main_user"; do
        if ! ls -lde "$workspace" | grep -Fq "user:$account allow"; then
            chmod +a "user:$account allow read,write,execute,delete_child,append,readattr,writeattr,readextattr,writeextattr,readsecurity,file_inherit,directory_inherit" "$workspace"
        fi
    done
fi
echo 'Plan (optional): deny only agent listing/searching your main HOME.'
echo 'This blocks ALL projects under your main HOME for agent. Agent projects must be in AgentWork.'
if $apply && confirm 'Protect your main HOME from the agent account?'; then
    if ! ls -lde "$main_home" | grep -Eq 'user:agent deny (list,search|read,execute)'; then
        chmod +a "user:agent deny list,search" "$main_home"
    fi
fi
if $apply; then
    echo 'Setup steps finished. Check actual access in your terminal:'
    printf '  sudo -v\n  "%s/.local/bin/agentctl" status\n' "$main_home"
    echo 'Next: bash scripts/install-agent-tools.sh (preview), then add --apply.'
else
    echo 'Preview only — nothing changed. To run interactively: bash scripts/setup-macos.sh --apply'
fi

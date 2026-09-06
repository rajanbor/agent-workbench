#!/bin/bash
# Install a locally built or downloaded bundle, without sudo.
set -euo pipefail
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
script_dir="$(cd "$(dirname "$0")" && pwd -P)"
source_dir="$(dirname "$script_dir")"
bundle="$source_dir/dist/Agent Workbench.app"
dry_run=false
for option in "$@"; do
    case "$option" in
        --dry-run) dry_run=true ;;
        --help) printf 'Usage: bash scripts/install.sh [--dry-run]\n'; exit 0 ;;
        *) printf 'Unknown option: %s\n' "$option" >&2; exit 1 ;;
    esac
done
[[ "$(uname -s)" == Darwin ]] || { echo 'macOS is required.' >&2; exit 1; }
[[ "$(id -u)" != 0 && "$(id -un)" != agent ]] || { echo 'Run from your main account, without sudo.' >&2; exit 1; }
[[ -d "$bundle" && ! -L "$bundle" ]] || { echo 'Build first: bash scripts/build-app.sh' >&2; exit 1; }
codesign --verify --deep --strict "$bundle"
owner_uid="$(id -u)"
runtime="/Users/Shared/AgentWorkbench-$owner_uid"
destination="$HOME/Applications/Agent Workbench.app"
cli="$HOME/.local/bin/agentctl"
check_owned_directory() {
    local directory="$1"
    [[ ! -L "$directory" ]] || { echo "Refusing symlink: $directory" >&2; exit 1; }
    if [[ -e "$directory" ]]; then
        [[ -d "$directory" && "$(stat -f %u "$directory")" == "$owner_uid" ]] || { echo "Unexpected owner: $directory" >&2; exit 1; }
        [[ -z "$(find "$directory" -prune -perm +0022 -print)" ]] || { echo "Directory writable by other accounts: $directory" >&2; exit 1; }
        [[ "$(ls -lde "$directory" | awk '{print $1}')" != *+ ]] || { echo "Review extended ACLs before installing: $directory" >&2; exit 1; }
    fi
}
for directory in "$runtime" "$HOME/Applications" "$HOME/.local" "$HOME/.local/bin"; do check_owned_directory "$directory"; done
if [[ -e "$cli" || -L "$cli" ]]; then
    [[ -L "$cli" && "$(readlink "$cli")" == "$runtime/agentctl" ]] || { echo "Existing agentctl preserved: $cli" >&2; exit 1; }
fi
if [[ -e "$destination" || -L "$destination" ]]; then
    check_owned_directory "$destination"
    [[ "$(defaults read "$destination/Contents/Info" CFBundleIdentifier)" == local.agentworkbench.app ]] || { echo 'Unrelated app at destination; refusing to replace it.' >&2; exit 1; }
fi
printf 'Install app: %s\nInstall launcher: %s\nCLI link: %s\n' "$destination" "$runtime/agentctl" "$cli"
$dry_run && exit 0
umask 022
mkdir -p "$runtime" "$HOME/Applications" "$HOME/.local/bin"
check_owned_directory "$runtime"
staging="$(mktemp -d "$runtime/install.XXXXXXXX")"
echo "Installation staging (retained for recovery): $staging"
ditto "$bundle" "$staging/Agent Workbench.app"
cp "$bundle/Contents/MacOS/agentctl" "$staging/agentctl"
chmod 755 "$staging/agentctl"
codesign --verify --strict "$staging/agentctl"
if [[ -e "$destination" ]]; then mv "$destination" "$staging/Previous Agent Workbench.app"; fi
mv "$staging/Agent Workbench.app" "$destination"
mv -f "$staging/agentctl" "$runtime/agentctl"
[[ -L "$cli" ]] || ln -s "$runtime/agentctl" "$cli"
printf '\nInstalled. Next: bash scripts/setup-macos.sh\nOpen: open "%s"\nCLI: "%s"\n' "$destination" "$cli"
echo 'If agentctl is not in PATH, use its full path or add ~/.local/bin yourself.'

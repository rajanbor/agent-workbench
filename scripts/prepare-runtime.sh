#!/bin/bash
# User-scoped launcher setup for an app installed by macOS Installer.
set -euo pipefail
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
[[ $# == 1 || ( $# == 2 && "$2" == --dry-run ) ]] || { echo 'Usage: prepare-runtime.sh /path/to/App.app [--dry-run]' >&2; exit 1; }
bundle="$1"
[[ "$(uname -s)" == Darwin && "$(id -u)" != 0 && "$(id -un)" != agent ]] || { echo 'Run from your main macOS account, without sudo.' >&2; exit 1; }
[[ -d "$bundle" && ! -L "$bundle" ]] || exit 1
codesign --verify --deep --strict "$bundle"
owner_uid="$(id -u)"
runtime="/Users/Shared/AgentWorkbench-$owner_uid"
cli="$HOME/.local/bin/agentctl"
check_directory() {
    local directory="$1"
    [[ ! -L "$directory" ]] || { echo "Refusing symlink: $directory" >&2; exit 1; }
    if [[ -e "$directory" ]]; then
        [[ -d "$directory" && "$(stat -f %u "$directory")" == "$owner_uid" ]] || { echo "Unexpected owner: $directory" >&2; exit 1; }
        [[ -z "$(find "$directory" -prune -perm +0022 -print)" ]] || { echo "Directory writable by other accounts: $directory" >&2; exit 1; }
        [[ "$(ls -lde "$directory" | awk '{print $1}')" != *+ ]] || { echo "Review extended ACLs: $directory" >&2; exit 1; }
    fi
}
for directory in "$runtime" "$HOME/.local" "$HOME/.local/bin"; do check_directory "$directory"; done
if [[ -e "$cli" || -L "$cli" ]]; then
    [[ -L "$cli" && "$(readlink "$cli")" == "$runtime/agentctl" ]] || { echo "Existing agentctl preserved: $cli" >&2; exit 1; }
fi
printf 'Prepare launcher: %s\nCLI link: %s\n' "$runtime/agentctl" "$cli"
[[ "${2:-}" != --dry-run ]] || exit 0
umask 022
mkdir -p "$runtime" "$HOME/.local/bin"
check_directory "$runtime"
staging="$(mktemp -d "$runtime/setup.XXXXXXXX")"
cp "$bundle/Contents/MacOS/agentctl" "$staging/agentctl"
chmod 755 "$staging/agentctl"
codesign --verify --strict "$staging/agentctl"
mv -f "$staging/agentctl" "$runtime/agentctl"
[[ -L "$cli" ]] || ln -s "$runtime/agentctl" "$cli"
rmdir "$staging"
echo 'Launcher ready. No account or system permissions were changed.'

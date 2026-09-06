#!/bin/bash
# Preview on the main account; install only after switching to agent.
set -euo pipefail
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
mode=preview
for option in "$@"; do
    case "$option" in
        --apply) mode=apply ;;
        --as-agent) mode=agent ;;
        --dry-run) mode=preview ;;
        --help) echo 'Usage: bash scripts/install-agent-tools.sh [--apply | --dry-run]'; exit 0 ;;
        *) echo "Unknown option: $option" >&2; exit 1 ;;
    esac
done
[[ "$(uname -s)" == Darwin ]] || exit 1
if [[ "$mode" != agent ]]; then
    echo 'Plan: switch to agent; install Node 24.20.0 in agent HOME if needed, then Codex and Claude via user-local npm.'
    echo 'Node archives use pinned SHA-256 checksums. Agent packages come from registry.npmjs.org.'
    echo 'No sudo npm, credential migration or automatic provider login.'
    [[ "$mode" == apply ]] || { echo 'Preview only. Add --apply to continue.'; exit 0; }
    [[ "$(id -u)" != 0 && "$(id -un)" != agent ]] || { echo 'Run --apply as your main account.' >&2; exit 1; }
    id agent >/dev/null 2>&1 || { echo 'Run setup-macos.sh first.' >&2; exit 1; }
    for group in $(id -Gn agent); do [[ "$group" != admin && "$group" != wheel ]] || { echo 'Agent must be standard.' >&2; exit 1; }; done
    printf 'Install tools in the agent account? Type INSTALL: '
    read -r answer
    [[ "$answer" == INSTALL ]] || exit 0
    # The checked-in script travels through stdin because agent cannot read the main HOME.
    # sudo reads its password from /dev/tty. Credentials are not shell arguments or variables.
    script_path="$(cd "$(dirname "$0")" && pwd -P)/$(basename "$0")"
    /usr/bin/env -i PATH=/usr/bin:/bin:/usr/sbin:/sbin /usr/bin/sudo -iu agent /usr/bin/env -i HOME=/Users/agent USER=agent LOGNAME=agent PATH=/usr/bin:/bin:/usr/sbin:/sbin /bin/bash -s -- --as-agent < "$script_path"
    exit $?
fi
[[ "$(id -un)" == agent && "$(id -u)" != 0 && "$HOME" == /Users/agent && ! -L "$HOME" ]] || { echo 'Installer requires the standard agent account and its own HOME.' >&2; exit 1; }
for group in $(id -Gn); do [[ "$group" != admin && "$group" != wheel ]] || exit 1; done
umask 077
export PATH="$HOME/.local/node/bin:$HOME/.local/npm/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
    node_version=v24.20.0
    case "$(uname -m)" in
        arm64) architecture=arm64; expected=40e5607e5ecb3db9192723776da2d75d966260fc74a7a9e731c1bd67dda96bc8 ;;
        x86_64) architecture=x64; expected=9e5b2644cf107befb6aefca676b96d3296bc10138096f022ed378d6233ed81f4 ;;
        *) echo 'Unsupported CPU architecture.' >&2; exit 1 ;;
    esac
    package="node-$node_version-darwin-$architecture"
    mkdir -p "$HOME/.local"
    download_dir="$(mktemp -d "$HOME/.local/agentworkbench-node.XXXXXXXX")"
    curl --proto '=https' --tlsv1.2 -fL "https://nodejs.org/dist/$node_version/$package.tar.gz" -o "$download_dir/node.tar.gz"
    actual="$(shasum -a 256 "$download_dir/node.tar.gz" | awk '{print $1}')"
    [[ "$actual" == "$expected" ]] || { echo "Checksum mismatch. Download retained: $download_dir" >&2; exit 1; }
    tar -xzf "$download_dir/node.tar.gz" -C "$download_dir"
    if [[ -e "$HOME/.local/node" || -L "$HOME/.local/node" ]]; then
        echo 'Existing ~/.local/node preserved. Update it manually and retry.' >&2; exit 1
    fi
    mv "$download_dir/$package" "$HOME/.local/node"
    echo "Verified Node archive retained at $download_dir"
fi
mkdir -p "$HOME/.local/npm"
npm config set prefix "$HOME/.local/npm"
npm install --global --registry=https://registry.npmjs.org @openai/codex @anthropic-ai/claude-code
# One managed line, only in agent's profile. Existing content is preserved.
profile_line='export PATH="$HOME/.local/node/bin:$HOME/.local/npm/bin:$HOME/.local/bin:$PATH" # Agent Workbench'
[[ ! -L "$HOME/.zprofile" ]] || { echo 'Symlinked .zprofile preserved. Add the PATH line manually.' >&2; exit 1; }
if ! grep -Fq '# Agent Workbench' "$HOME/.zprofile" 2>/dev/null; then printf '\n%s\n' "$profile_line" >> "$HOME/.zprofile"; fi
printf '\nInstalled as %s (UID %s):\n' "$(id -un)" "$(id -u)"
node --version
codex --version
claude --version
echo 'Next: log in separately with codex login and claude. Do not copy main-account credentials.'

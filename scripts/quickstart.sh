#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "$*" in
    --dry-run|--help)
        echo 'Agent Workbench guided setup'
        echo '1. Build if no release bundle is present (requires Swift 6).'
        echo '2. Install app and CLI as the main user.'
        echo '3. Preview and confirm standard agent account/workspace/HOME permissions.'
        echo '4. Confirm tool installation in agent HOME, then open the app.'
        echo 'Usage: bash scripts/quickstart.sh [--dry-run]'
        exit 0 ;;
    '') ;;
    *) echo 'Unknown option.' >&2; exit 1 ;;
esac
[[ "$(uname -s)" == Darwin && "$(id -u)" != 0 && "$(id -un)" != agent ]] || { echo 'Run on macOS from your main account, without sudo.' >&2; exit 1; }
echo 'Agent Workbench — guided installation'
echo 'You will review account creation, workspace access, HOME protection and agent tool installation separately.'
printf 'Start installation? Type START: '
read -r answer
[[ "$answer" == START ]] || exit 0
if [[ ! -d 'dist/Agent Workbench.app' ]]; then bash scripts/build-app.sh; fi
bash scripts/install.sh
bash scripts/setup-macos.sh --apply
bash scripts/install-agent-tools.sh --apply
open "$HOME/Applications/Agent Workbench.app"

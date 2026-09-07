#!/bin/bash
# Invoked by the installed application. Never run this entire guide with sudo.
set -euo pipefail
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
script_dir="$(cd "$(dirname "$0")" && pwd -P)"
bundle="$(cd "$script_dir/../../.." && pwd -P)"
case "${1:-}" in
    --dry-run)
        echo '1. Prepare the launcher for your main account.'
        echo '2. Review creation of agent, workspace access and HOME protection.'
        echo '3. Review installation of Codex and Claude in agent HOME.'
        exit 0 ;;
    '') ;;
    *) exit 1 ;;
esac
[[ "$(id -u)" != 0 && "$(id -un)" != agent ]] || { echo 'Open Agent Workbench from your main account.' >&2; exit 1; }
trap 'echo "Konfiguracja została przerwana. Komunikat powyżej wyjaśnia przyczynę. Możesz spróbować ponownie z aplikacji."' ERR
printf '\nAgent Workbench — pierwsza konfiguracja\n\n'
echo 'Nie wpisuj żadnych komend. Odpowiadaj na pytania poniżej.'
echo 'Hasła obsługuje macOS. Konto agent pozostaje użytkownikiem standardowym.'
/bin/bash "$script_dir/prepare-runtime.sh" "$bundle"
/bin/bash "$script_dir/setup-macos.sh" --apply
/bin/bash "$script_dir/install-agent-tools.sh" --apply
printf '\nZakończono wybrane kroki. Wróć do aplikacji.\n'
echo 'Przyciski Zaloguj Codex / Zaloguj Claude otworzą osobne logowanie do narzędzi.'
/usr/bin/open "$bundle"

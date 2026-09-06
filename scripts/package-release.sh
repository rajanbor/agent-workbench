#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -d 'dist/Agent Workbench.app' ]] || { echo 'Build first.' >&2; exit 1; }
architecture="$(uname -m)"
case "$architecture" in arm64|x86_64) ;; *) exit 1 ;; esac
staging="$(mktemp -d "$PWD/dist/package.XXXXXXXX")"
package_dir="$staging/AgentWorkbench"
mkdir -p "$package_dir/dist"
ditto 'dist/Agent Workbench.app' "$package_dir/dist/Agent Workbench.app"
cp -R scripts docs "$package_dir/"
cp README.md LICENSE NOTICE SECURITY.md CHANGELOG.md "$package_dir/"
archive="$PWD/dist/AgentWorkbench-macos-$architecture.zip"
ditto -c -k --keepParent "$package_dir" "$archive"
cd dist
shasum -a 256 "AgentWorkbench-macos-$architecture.zip" > "AgentWorkbench-macos-$architecture.zip.sha256"
echo "Release archive: $archive"

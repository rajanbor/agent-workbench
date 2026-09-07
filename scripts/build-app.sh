#!/bin/bash
# Build only; installation is an explicit separate step.
set -euo pipefail
cd "$(dirname "$0")/.."
swift build -c release
binary_dir="$(swift build -c release --show-bin-path)"
bundle="dist/Agent Workbench.app"
mkdir -p "$bundle/Contents/MacOS" "$bundle/Contents/Resources"
cp "$binary_dir/AgentWorkbench" "$bundle/Contents/MacOS/AgentWorkbench"
cp "$binary_dir/agentctl" "$bundle/Contents/MacOS/agentctl"
cp resources/Info.plist "$bundle/Contents/Info.plist"
cp LICENSE NOTICE "$bundle/Contents/Resources/"
# Intel linkers do not add the implicit ad-hoc signature used on Apple Silicon.
# Sign the standalone helper first, then seal the containing application.
codesign --force --sign - "$bundle/Contents/MacOS/agentctl"
codesign --force --sign - "$bundle"
codesign --verify --deep --strict "$bundle"
printf 'Built: %s/%s\n' "$PWD" "$bundle"

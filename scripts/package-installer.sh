#!/bin/bash
# Merge the two CI builds into one universal app and a script-free Installer product.
set -euo pipefail
export PATH=/usr/bin:/bin:/usr/sbin:/sbin
cd "$(dirname "$0")/.."
[[ $# == 1 ]] || { echo 'Usage: package-installer.sh /path/to/release-assets' >&2; exit 1; }
assets="$(cd "$1" && pwd -P)"
mkdir -p dist
staging="$(mktemp -d "$PWD/dist/installer.XXXXXXXX")"
for architecture in arm64 x86_64; do
    (cd "$assets" && shasum -a 256 -c "AgentWorkbench-macos-$architecture.zip.sha256")
    ditto -x -k "$assets/AgentWorkbench-macos-$architecture.zip" "$staging/$architecture"
    codesign --verify --deep --strict "$staging/$architecture/AgentWorkbench/dist/Agent Workbench.app"
done
cmp "$staging/arm64/AgentWorkbench/dist/Agent Workbench.app/Contents/Info.plist" \
    "$staging/x86_64/AgentWorkbench/dist/Agent Workbench.app/Contents/Info.plist"
diff -qr "$staging/arm64/AgentWorkbench/dist/Agent Workbench.app/Contents/Resources" \
    "$staging/x86_64/AgentWorkbench/dist/Agent Workbench.app/Contents/Resources"
bundle="$staging/root/Applications/Agent Workbench.app"
mkdir -p "$staging/root/Applications"
ditto "$staging/arm64/AgentWorkbench/dist/Agent Workbench.app" "$bundle"
for executable in AgentWorkbench agentctl; do
    lipo -create "$staging/arm64/AgentWorkbench/dist/Agent Workbench.app/Contents/MacOS/$executable" \
        "$staging/x86_64/AgentWorkbench/dist/Agent Workbench.app/Contents/MacOS/$executable" \
        -output "$bundle/Contents/MacOS/$executable"
    lipo "$bundle/Contents/MacOS/$executable" -verify_arch arm64 x86_64
done
codesign --force --sign - "$bundle/Contents/MacOS/agentctl"
codesign --force --sign - "$bundle"
codesign --verify --deep --strict "$bundle"
pkgbuild --analyze --root "$staging/root" "$staging/components.plist"
# Always install into /Applications, including when a previous manual copy exists.
/usr/libexec/PlistBuddy -c 'Set :0:BundleIsRelocatable false' "$staging/components.plist"
/usr/libexec/PlistBuddy -c 'Set :0:BundleOverwriteAction upgrade' "$staging/components.plist"
version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$bundle/Contents/Info.plist")"
build="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$bundle/Contents/Info.plist")"
pkgbuild --root "$staging/root" --component-plist "$staging/components.plist" \
    --identifier io.github.rajanbor.agentworkbench --version "$version.$build" \
    --install-location / --ownership recommended "$staging/AgentWorkbench-component.pkg"
productbuild --distribution resources/installer/Distribution.xml --resources resources/installer \
    --package-path "$staging" "$assets/AgentWorkbench-macos-universal.pkg"
(cd "$assets" && shasum -a 256 AgentWorkbench-macos-universal.pkg > AgentWorkbench-macos-universal.pkg.sha256)
echo "Installer: $assets/AgentWorkbench-macos-universal.pkg"

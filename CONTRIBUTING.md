# Contributing

Use macOS 14+ and Xcode 16+ (Swift 6). Fork the repository, create a branch,
and keep changes focused. Run:

```sh
swift test
bash scripts/build-app.sh
for script in scripts/*.sh; do bash -n "$script"; done
bash scripts/setup-macos.sh --dry-run
```

Normal tests never create users or require sudo. Integration tests are
opt-in: they require an existing standard account named agent and the installed
launcher. CI provisions that account on disposable macOS runners:

```sh
AGENT_WORKBENCH_INTEGRATION=1 swift test
```

The full UID-switch test runs only on CI after the setup script protects the
runner HOME. No real provider credentials are used. Tagged commits passing both
macOS jobs are automatically published as prereleases with checksum files.

Keep OS process execution in ProcessRunner. Do not add environment inheritance,
arbitrary sudo rules, shell eval, credential forwarding or filesystem sandbox
claims that are not enforced. Setup scripts must retain read-only previews.
Changes to launch/permissions need tests that try to violate the boundary.

Explain what you tested and what needs interactive macOS verification. Do not
commit local config, binaries, transcripts, real home paths or credentials.
Contributions are licensed under Apache-2.0. Be respectful and discuss technical
tradeoffs; harassment and personal attacks are not welcome.

# Sandbox architecture

`SandboxProvider` creates, inspects and destroys sandbox instances, exposes their policy and starts approved processes. Implementations are `NativeUserSandbox`, `ContainerSandbox`, `RemoteSandbox` and a future `VMSandbox`.

The provider decides how isolation works; the domain model exposes the common policy: workspace mounts, filesystem scope, network policy, shell, browser, Git, secret references and resource limits. Docker, Podman and OrbStack are container engines behind the container provider, not UI-specific modes.

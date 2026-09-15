# Domain model

| Object | Responsibility |
| --- | --- |
| Machine | Local or remote host that reports capabilities and hosts runtimes |
| Runtime | Native-user, container, remote or future VM execution implementation |
| Sandbox | Isolated execution boundary with workspace mounts and policy |
| Workspace | User folder or repository associated with a sandbox |
| Session | Persistent work context and panel layout |
| Agent | Configured actor with a model, permissions and role |
| Model / Provider | Model capability and its transport or authentication adapter |
| Task / Run | Requested work and one concrete execution attempt |
| Terminal | Interactive shell attached to a sandbox or agent run |

`Agent` has `id`, `name`, `role`, `model`, `provider`, `machine`, `sandbox`, `tools`, `permissions`, `systemPrompt`, `budget` and `delegationPolicy`. The main agent is an agent whose role is `orchestrator`; it has no special provider coupling.

Every relationship is stored by stable ID. UI state may cache summaries but never becomes the authority for permissions or runtime state.

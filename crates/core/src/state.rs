//! Prototype workbench state.
//!
//! Every value here is local, deterministic and labeled as prototype data in
//! the UI. It exists so the shell can be built against the real domain shape
//! before `workbenchd` owns persistence. Nothing in this module reads the
//! network, spawns a process or touches provider credentials.
use crate::domain::*;

pub fn snapshot() -> DesktopSnapshot {
    DesktopSnapshot {
        computer: computer(),
        providers: providers(),
        models: models(),
        agents: agents(),
        sandboxes: sandboxes(),
        sessions: sessions(),
        terminals: terminals(),
        workflow: workflow(),
        capabilities: capabilities(),
        library: library(),
        usage: usage(),
        version_control: version_control(),
        inspector: inspector_policy(),
    }
}

fn computer() -> ComputerProfile {
    ComputerProfile {
        operating_system: std::env::consts::OS.into(),
        architecture: std::env::consts::ARCH.into(),
        device_kind: device_kind().into(),
        runtime_status: "Host runtime ready".into(),
        energy: DeviceEnergy {
            power_budget_w: 45.0,
            memory_gb: 36.0,
            battery_wh: 72.4,
            price_per_kwh: 0.28,
            basis: "estimate · declared for this device class".into(),
        },
    }
}

fn device_kind() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "Mac"
    }
    #[cfg(target_os = "windows")]
    {
        "Windows PC"
    }
    #[cfg(target_os = "linux")]
    {
        "Linux computer"
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "Computer"
    }
}

fn providers() -> Vec<Provider> {
    vec![
        Provider {
            id: "claude".into(),
            name: "Claude".into(),
            detail: "Connect with your existing subscription".into(),
            connected: false,
        },
        Provider {
            id: "codex".into(),
            name: "Codex".into(),
            detail: "Connect with your existing subscription".into(),
            connected: false,
        },
        Provider {
            id: "gemini".into(),
            name: "Gemini".into(),
            detail: "Provider adapter planned".into(),
            connected: false,
        },
        Provider {
            id: "local".into(),
            name: "Local runtime".into(),
            detail: "Built-in inspector, no account required".into(),
            connected: true,
        },
    ]
}

fn reference(kind: &str, label: &str, url: &str) -> Reference {
    Reference {
        kind: kind.into(),
        label: label.into(),
        url: url.into(),
    }
}

fn models() -> Vec<ModelCard> {
    vec![
        ModelCard {
            id: "inspector-local".into(),
            name: "Open Cube Inspector".into(),
            vendor: "Built in".into(),
            task: "Workspace summarisation".into(),
            icon: "cube".into(),
            accent: "accent".into(),
            parameters: "rule based".into(),
            context: "snapshot scoped".into(),
            updated: "ships with the app".into(),
            downloads: None,
            likes: None,
            location: ModelLocation::Local,
            ready: true,
            version: "v1".into(),
            digest: "sha256:0a91f4c2".into(),
            revisions: vec![ModelRevision {
                version: "v1".into(),
                digest: "sha256:0a91f4c2".into(),
                published: "with 0.2.0-alpha.1".into(),
                note: "Read-only snapshot summariser, no egress".into(),
                pinned: true,
            }],
            pricing: None,
            summary: "Answers questions about this workbench from the engine snapshot. Rule based, not a language model: it cannot improvise, and it cannot read anything its policy does not grant.".into(),
            strengths: vec![
                "Explains agents, sandboxes, spend and policy".into(),
                "Runs with no account and no network".into(),
                "Every answer names its sources".into(),
            ],
            requirements: vec!["None — ships with the app".into()],
            license: "Apache-2.0 (part of Open Cube)".into(),
            reference: reference("docs", "Inspector spec", "https://github.com/rajanbor/open-cube/blob/main/.ai/specs/INSPECTOR_MODEL.md"),
            local_profile: None,
        },
        ModelCard {
            id: "claude-sonnet".into(),
            name: "Claude Sonnet".into(),
            vendor: "Anthropic".into(),
            task: "Text · tools".into(),
            icon: "agent".into(),
            accent: "amber".into(),
            parameters: "hosted".into(),
            context: "200k".into(),
            updated: "provider managed".into(),
            downloads: None,
            likes: None,
            location: ModelLocation::Api,
            ready: false,
            version: "provider default".into(),
            digest: "pinned by provider".into(),
            revisions: vec![ModelRevision {
                version: "provider default".into(),
                digest: "pinned by provider".into(),
                published: "—".into(),
                note: "Version follows the provider until an adapter pins it".into(),
                pinned: false,
            }],
            pricing: Some(Pricing {
                input_per_mtok: 3.0,
                output_per_mtok: 15.0,
            }),
            summary: "Hosted general model with tool use and a long context. In Open Cube it runs through the Claude Code tool inside the agent account, so the subscription and the credentials stay with that tool.".into(),
            strengths: vec![
                "Long-context reading of a whole workspace".into(),
                "Tool use and multi-step planning".into(),
                "Strong at writing and reviewing prose".into(),
            ],
            requirements: vec![
                "Provider account, signed in through Claude Code".into(),
                "Network access from the sandbox to api.anthropic.com".into(),
            ],
            license: "Commercial API terms".into(),
            reference: reference("api", "Anthropic API documentation", "https://docs.anthropic.com/en/api/overview"),
            local_profile: None,
        },
        ModelCard {
            id: "codex".into(),
            name: "Codex".into(),
            vendor: "OpenAI".into(),
            task: "Code · tools".into(),
            icon: "code".into(),
            accent: "violet".into(),
            parameters: "hosted".into(),
            context: "provider managed".into(),
            updated: "provider managed".into(),
            downloads: None,
            likes: None,
            location: ModelLocation::Api,
            ready: false,
            version: "provider default".into(),
            digest: "pinned by provider".into(),
            revisions: vec![ModelRevision {
                version: "provider default".into(),
                digest: "pinned by provider".into(),
                published: "—".into(),
                note: "Subscription execution through the agent account".into(),
                pinned: false,
            }],
            pricing: None,
            summary: "Hosted coding agent driven by the Codex CLI. Cost is carried by the subscription rather than metered per token, so spend shows as zero here.".into(),
            strengths: vec![
                "Repository-scale code changes".into(),
                "Runs as its own CLI inside the sandbox".into(),
            ],
            requirements: vec![
                "Provider account, signed in through the Codex CLI".into(),
                "Network access from the sandbox".into(),
            ],
            license: "Commercial API terms".into(),
            reference: reference("api", "OpenAI platform documentation", "https://platform.openai.com/docs"),
            local_profile: None,
        },
        ModelCard {
            id: "qwen2.5-7b".into(),
            name: "Qwen2.5 7B Instruct".into(),
            vendor: "Alibaba".into(),
            task: "Text Generation".into(),
            icon: "model".into(),
            accent: "green".into(),
            parameters: "7B".into(),
            context: "32k".into(),
            updated: "catalogued".into(),
            downloads: Some("4.7 GB".into()),
            likes: None,
            location: ModelLocation::Local,
            ready: false,
            version: "q4_k_m".into(),
            digest: "sha256:6d1e08b7".into(),
            revisions: vec![
                ModelRevision {
                    version: "q4_k_m".into(),
                    digest: "sha256:6d1e08b7".into(),
                    published: "not downloaded".into(),
                    note: "4-bit build, 8 GB unified memory".into(),
                    pinned: true,
                },
                ModelRevision {
                    version: "q8_0".into(),
                    digest: "sha256:b20c93de".into(),
                    published: "not downloaded".into(),
                    note: "8-bit build, 12 GB unified memory".into(),
                    pinned: false,
                },
            ],
            pricing: None,
            summary: "Open-weight instruct model that runs on the machine. Good default for review and summarisation work that should never leave the device.".into(),
            strengths: vec![
                "Runs offline, no account".into(),
                "Balanced quality for its size".into(),
                "Permissive licence".into(),
            ],
            requirements: vec![
                "8 GB unified memory at 4-bit".into(),
                "4.7 GB free disk".into(),
                "Metal, CUDA or CPU fallback".into(),
            ],
            license: "Apache-2.0".into(),
            reference: reference("huggingface", "Qwen/Qwen2.5-7B-Instruct", "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct"),
            local_profile: Some(LocalProfile {
                throughput_tps: 28.0,
                prefill_factor: 8.0,
                power_draw_w: 22.0,
                memory_gb: 5.5,
                accelerator: "Metal".into(),
            }),
        },
        ModelCard {
            id: "llama3.2-3b".into(),
            name: "Llama 3.2 3B Instruct".into(),
            vendor: "Meta".into(),
            task: "Text Generation".into(),
            icon: "bolt".into(),
            accent: "red".into(),
            parameters: "3B".into(),
            context: "128k".into(),
            updated: "catalogued".into(),
            downloads: Some("2.0 GB".into()),
            likes: None,
            location: ModelLocation::Local,
            ready: false,
            version: "q4_k_m".into(),
            digest: "sha256:91c4f0aa".into(),
            revisions: vec![ModelRevision {
                version: "q4_k_m".into(),
                digest: "sha256:91c4f0aa".into(),
                published: "not downloaded".into(),
                note: "4-bit build, 6 GB unified memory".into(),
                pinned: true,
            }],
            pricing: None,
            summary: "Small open-weight model for fast local passes: classification, triage and short summaries where latency matters more than depth.".into(),
            strengths: vec![
                "Fast on modest hardware".into(),
                "Long context for its size".into(),
            ],
            requirements: vec![
                "6 GB unified memory at 4-bit".into(),
                "2.0 GB free disk".into(),
                "Licence acceptance on Hugging Face".into(),
            ],
            license: "Llama 3.2 Community License".into(),
            reference: reference("huggingface", "meta-llama/Llama-3.2-3B-Instruct", "https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct"),
            local_profile: Some(LocalProfile {
                throughput_tps: 55.0,
                prefill_factor: 10.0,
                power_draw_w: 16.0,
                memory_gb: 2.8,
                accelerator: "Metal".into(),
            }),
        },
        ModelCard {
            id: "mistral-7b".into(),
            name: "Mistral 7B Instruct".into(),
            vendor: "Mistral".into(),
            task: "Text Generation".into(),
            icon: "sandbox".into(),
            accent: "violet".into(),
            parameters: "7B".into(),
            context: "32k".into(),
            updated: "catalogued".into(),
            downloads: Some("4.1 GB".into()),
            likes: None,
            location: ModelLocation::Local,
            ready: false,
            version: "q4_k_m".into(),
            digest: "sha256:3ef7a105".into(),
            revisions: vec![ModelRevision {
                version: "q4_k_m".into(),
                digest: "sha256:3ef7a105".into(),
                published: "not downloaded".into(),
                note: "4-bit build, 8 GB unified memory".into(),
                pinned: true,
            }],
            pricing: None,
            summary: "Open-weight instruct model with a permissive licence, often used as a local fallback when a hosted provider is unavailable.".into(),
            strengths: vec![
                "Permissive licence, no account".into(),
                "Steady instruction following".into(),
            ],
            requirements: vec![
                "8 GB unified memory at 4-bit".into(),
                "4.1 GB free disk".into(),
            ],
            license: "Apache-2.0".into(),
            reference: reference("huggingface", "mistralai/Mistral-7B-Instruct-v0.3", "https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3"),
            local_profile: Some(LocalProfile {
                throughput_tps: 26.0,
                prefill_factor: 8.0,
                power_draw_w: 21.0,
                memory_gb: 5.2,
                accelerator: "Metal".into(),
            }),
        },
    ]
}
fn agents() -> Vec<Agent> {
    vec![
        Agent {
            id: "chief".into(),
            name: "Chief".into(),
            role: "Orchestrator".into(),
            status: "running".into(),
            model_id: "claude-sonnet".into(),
            sandbox_id: "product-dev".into(),
            machine: "MacBook Pro".into(),
            task: "Rebuild the workbench shell".into(),
            last_message: "Shell rebuilt, waiting on your review of the canvas layout.".into(),
            updated_at: "8 min".into(),
            accent: "green".into(),
            revision: "7b21e4a9".into(),
            tokens_in: 9_400,
            tokens_out: 3_000,
            cost_usd: 0.31,
            permissions: vec![
                permission("Files", "workspace", "scoped"),
                permission("Network", "limited", "review"),
                permission("Shell", "approval", "review"),
                permission("Delegation", "none", "off"),
            ],
            project: ProjectRef {
                name: "Open Cube".into(),
                path: "~/Projects/open-cube".into(),
                branch: "main".into(),
            },
            chats: vec![
                ChatRef { id: "chief-main".into(), title: "Shell rebuild".into(), updated_at: "8 min".into() },
                ChatRef { id: "chief-review".into(), title: "Design review".into(), updated_at: "yesterday".into() },
            ],
            blueprint: AgentBlueprint {
                instructions: "Read the workspace specification before proposing a change. Open a diff for review; never write outside the workspace root.".into(),
                patterns: vec!["review-before-write".into(), "one-change-per-run".into()],
                skills: vec!["repo-map".into(), "diff-review".into(), "design-tokens".into()],
                mcp: vec!["filesystem".into(), "git".into()],
                tools: vec!["snapshot".into(), "inspect".into(), "agents_in".into()],
            },
        },
        Agent {
            id: "backend".into(),
            name: "Backend Migrator".into(),
            role: "Implementation".into(),
            status: "waiting".into(),
            model_id: "codex".into(),
            sandbox_id: "product-dev".into(),
            machine: "MacBook Pro".into(),
            task: "Port runtime adapters to the Rust engine".into(),
            last_message: "Waiting for approval on `cargo test` before the next module.".into(),
            updated_at: "1 h".into(),
            accent: "violet".into(),
            revision: "c4e13d80".into(),
            tokens_in: 28_100,
            tokens_out: 10_000,
            cost_usd: 0.94,
            permissions: vec![
                permission("Files", "workspace", "scoped"),
                permission("Network", "off", "off"),
                permission("Shell", "approval", "review"),
                permission("Delegation", "none", "off"),
            ],
            project: ProjectRef {
                name: "Open Cube".into(),
                path: "~/Projects/open-cube".into(),
                branch: "agent/runtime-migration".into(),
            },
            chats: vec![
                ChatRef { id: "backend-main".into(), title: "Runtime migration".into(), updated_at: "1 h".into() },
            ],
            blueprint: AgentBlueprint {
                instructions: "Port one runtime adapter per run. Run the test suite before proposing the diff, and stop for approval before any shell command.".into(),
                patterns: vec!["one-change-per-run".into(), "test-before-propose".into(), "approval-for-shell".into()],
                skills: vec!["repo-map".into(), "cargo-tests".into()],
                mcp: vec!["filesystem".into(), "git".into()],
                tools: vec!["snapshot".into(), "spend".into()],
            },
        },
        Agent {
            id: "auditor".into(),
            name: "UI Auditor".into(),
            role: "Review".into(),
            status: "idle".into(),
            model_id: "qwen2.5-7b".into(),
            sandbox_id: "review".into(),
            machine: "MacBook Pro".into(),
            task: "Contrast and focus sweep on changed screens".into(),
            last_message: "No local model downloaded, so the sweep has not started.".into(),
            updated_at: "yesterday".into(),
            accent: "blue".into(),
            revision: "5aa90e17".into(),
            tokens_in: 0,
            tokens_out: 0,
            cost_usd: 0.0,
            permissions: vec![
                permission("Files", "workspace", "scoped"),
                permission("Network", "off", "off"),
                permission("Shell", "off", "off"),
                permission("Delegation", "none", "off"),
            ],
            project: ProjectRef {
                name: "Design system".into(),
                path: "~/Projects/design-system".into(),
                branch: "main".into(),
            },
            chats: vec![
                ChatRef { id: "auditor-main".into(), title: "Contrast sweep".into(), updated_at: "yesterday".into() },
            ],
            blueprint: AgentBlueprint {
                instructions: "Check contrast, focus order and spacing on changed screens in both themes. Report findings; do not edit files.".into(),
                patterns: vec!["read-only".into(), "report-findings".into()],
                skills: vec!["design-tokens".into(), "accessibility-audit".into()],
                mcp: vec!["filesystem".into()],
                tools: vec!["snapshot".into()],
            },
        },
        Agent {
            id: "release".into(),
            name: "Release Notes".into(),
            role: "Writing".into(),
            status: "approval".into(),
            model_id: "claude-sonnet".into(),
            sandbox_id: "review".into(),
            machine: "MacBook Pro".into(),
            task: "Draft the alpha release note".into(),
            last_message: "Draft ready. Needs your approval before it touches CHANGELOG.md.".into(),
            updated_at: "2 d".into(),
            accent: "amber".into(),
            revision: "a05e2f77".into(),
            tokens_in: 4_800,
            tokens_out: 1_400,
            cost_usd: 0.12,
            permissions: vec![
                permission("Files", "docs", "scoped"),
                permission("Network", "off", "off"),
                permission("Shell", "off", "off"),
                permission("Delegation", "none", "off"),
            ],
            project: ProjectRef {
                name: "Open Cube".into(),
                path: "~/Projects/open-cube".into(),
                branch: "main".into(),
            },
            chats: vec![
                ChatRef { id: "release-main".into(), title: "Alpha release note".into(), updated_at: "2 d".into() },
            ],
            blueprint: AgentBlueprint {
                instructions: "Draft release notes from the changelog and the commit history. Never touch a file without approval.".into(),
                patterns: vec!["review-before-write".into(), "report-findings".into()],
                skills: vec!["changelog-writer".into()],
                mcp: vec!["git".into()],
                tools: vec!["snapshot".into(), "spend".into()],
            },
        },
    ]
}

fn permission(label: &str, value: &str, level: &str) -> Permission {
    Permission {
        label: label.into(),
        value: value.into(),
        level: level.into(),
    }
}

fn sandboxes() -> Vec<Sandbox> {
    vec![
        Sandbox {
            id: "product-dev".into(),
            name: "product-dev".into(),
            isolation: "Separate standard macOS user · agent".into(),
            state: "active".into(),
            machine: "MacBook Pro".into(),
            disk: "1.8 GB of 20 GB".into(),
            mounts: vec![
                Mount {
                    path: "~/Projects/open-cube".into(),
                    mode: "read-write".into(),
                },
                Mount {
                    path: "~/Library/Caches/open-cube".into(),
                    mode: "read-write".into(),
                },
                Mount {
                    path: "/usr/local".into(),
                    mode: "denied".into(),
                },
            ],
            network: NetworkPolicy {
                mode: "limited".into(),
                allowlist: vec!["localhost".into(), "api.anthropic.com".into()],
            },
            processes: vec![
                SandboxProcess {
                    pid: 4821,
                    command: "claude --workspace open-cube".into(),
                    cpu: "12%".into(),
                    memory: "412 MB".into(),
                },
                SandboxProcess {
                    pid: 4839,
                    command: "vite --port 1420".into(),
                    cpu: "3%".into(),
                    memory: "188 MB".into(),
                },
            ],
            agents: vec!["chief".into(), "backend".into()],
        },
        Sandbox {
            id: "review".into(),
            name: "review".into(),
            isolation: "Separate standard macOS user · agent-review".into(),
            state: "idle".into(),
            machine: "MacBook Pro".into(),
            disk: "240 MB of 10 GB".into(),
            mounts: vec![
                Mount {
                    path: "~/Projects/open-cube/docs".into(),
                    mode: "read-only".into(),
                },
                Mount {
                    path: "~/Projects/open-cube/.ai".into(),
                    mode: "read-only".into(),
                },
            ],
            network: NetworkPolicy {
                mode: "off".into(),
                allowlist: vec![],
            },
            processes: vec![],
            agents: vec!["auditor".into(), "release".into()],
        },
        Sandbox {
            id: "docker-linux".into(),
            name: "docker-linux".into(),
            isolation: "Container runtime".into(),
            state: "planned".into(),
            machine: "MacBook Pro".into(),
            disk: "—".into(),
            mounts: vec![Mount {
                path: "workspace".into(),
                mode: "planned".into(),
            }],
            network: NetworkPolicy {
                mode: "planned".into(),
                allowlist: vec![],
            },
            processes: vec![],
            agents: vec![],
        },
    ]
}

fn sessions() -> Vec<Session> {
    vec![
        Session {
            id: "shell".into(),
            title: "Workbench shell redesign".into(),
            provider: "Claude".into(),
            project: "Open Cube".into(),
            status: "running".into(),
            updated_at: "8 min".into(),
        },
        Session {
            id: "runtime".into(),
            title: "Runtime adapter migration".into(),
            provider: "Codex".into(),
            project: "Open Cube".into(),
            status: "waiting".into(),
            updated_at: "1 h".into(),
        },
        Session {
            id: "audit".into(),
            title: "Contrast audit".into(),
            provider: "Qwen Local".into(),
            project: "Design system".into(),
            status: "idle".into(),
            updated_at: "yesterday".into(),
        },
    ]
}

fn terminals() -> Vec<TerminalSession> {
    vec![
        TerminalSession {
            id: "term-product-dev".into(),
            title: "product-dev".into(),
            sandbox_id: "product-dev".into(),
            shell: "zsh".into(),
            cwd: "~/Projects/open-cube".into(),
            state: "detached".into(),
            policy: "A live pty runs as the sandbox user and needs workbenchd; until then this pane replays the session log.".into(),
            lines: vec![
                line("prompt", "agent@product-dev ~/Projects/open-cube %"),
                line("input", "agentctl status"),
                line("output", "runtime      native (agent user)"),
                line("output", "sandbox      product-dev · active"),
                line("output", "providers    none connected"),
                line("prompt", "agent@product-dev ~/Projects/open-cube %"),
                line("input", "cargo test -p open-cube-engine"),
                line("output", "running 4 tests ... ok"),
            ],
        },
        TerminalSession {
            id: "term-review".into(),
            title: "review".into(),
            sandbox_id: "review".into(),
            shell: "zsh".into(),
            cwd: "~/Projects/open-cube/docs".into(),
            state: "detached".into(),
            policy: "Read-only sandbox: this terminal may never write or reach the network.".into(),
            lines: vec![
                line("prompt", "agent@review ~/Projects/open-cube/docs %"),
                line("input", "ls"),
                line("output", "QUICKSTART.pl.md  RELEASE_NOTES.md  SECURITY.md"),
            ],
        },
    ]
}

fn line(stream: &str, text: &str) -> TerminalLine {
    TerminalLine {
        stream: stream.into(),
        text: text.into(),
    }
}

fn workflow() -> Workflow {
    Workflow {
        id: "overnight".into(),
        name: "Overnight review".into(),
        nodes: vec![
            node("trigger", "trigger", "Schedule", "every night · 02:00", "ready", 40.0, 150.0),
            node("chief", "agent", "Chief", "claude-sonnet · product-dev", "running", 260.0, 60.0),
            node("backend", "agent", "Backend Migrator", "codex · product-dev", "waiting", 260.0, 240.0),
            node("sandbox", "sandbox", "product-dev", "native · limited network", "active", 500.0, 150.0),
            node("auditor", "agent", "UI Auditor", "qwen2.5-7b · review", "idle", 740.0, 60.0),
            node("report", "output", "Report", "notes + diff for review", "ready", 740.0, 240.0),
        ],
        edges: vec![
            edge("e1", "trigger", "chief", "start"),
            edge("e2", "trigger", "backend", "start"),
            edge("e3", "chief", "sandbox", "runs in"),
            edge("e4", "backend", "sandbox", "runs in"),
            edge("e5", "sandbox", "auditor", "diff"),
            edge("e6", "auditor", "report", "findings"),
        ],
    }
}

fn node(id: &str, kind: &str, label: &str, detail: &str, status: &str, x: f64, y: f64) -> WorkflowNode {
    WorkflowNode {
        id: id.into(),
        kind: kind.into(),
        label: label.into(),
        detail: detail.into(),
        status: status.into(),
        x,
        y,
    }
}

fn edge(id: &str, from: &str, to: &str, label: &str) -> WorkflowEdge {
    WorkflowEdge {
        id: id.into(),
        from: from.into(),
        to: to.into(),
        label: label.into(),
    }
}

fn capabilities() -> Capabilities {
    Capabilities {
        values: vec![
            value("workspace.root", "~/Projects/open-cube", "workspace", false),
            value("sandbox.default", "product-dev", "workspace", false),
            value("runtime.user", "agent", "machine", false),
            value("inspector.egress", "none", "machine", false),
            value("provider.token", "not stored by Open Cube", "provider", true),
            value("budget.daily", "$5.00", "workspace", false),
        ],
        functions: vec![
            function(
                "snapshot",
                "fn snapshot() -> DesktopSnapshot",
                "engine::state",
                "read",
                "Whole workbench state as one immutable value.",
            ),
            function(
                "inspect",
                "fn inspect(question: &str) -> InspectorAnswer",
                "engine::inspector",
                "read",
                "Scoped, redacted summary of agents, sandboxes, models and cost.",
            ),
            function(
                "agents_in",
                "fn agents_in(sandbox: &str) -> Vec<&Agent>",
                "engine::state",
                "read",
                "Agents attached to one sandbox.",
            ),
            function(
                "spend",
                "fn spend() -> UsageSummary",
                "engine::usage",
                "read",
                "Tokens and cost per model, per agent and per day.",
            ),
            function(
                "open_terminal",
                "fn open_terminal(sandbox: &str) -> Result<TerminalSession>",
                "engine::terminal",
                "execute",
                "Blocked until workbenchd owns the sandbox pty.",
            ),
            function(
                "run_agent",
                "fn run_agent(agent: &str) -> Result<Run>",
                "engine::runtime",
                "execute",
                "Blocked until the provider runtime is migrated.",
            ),
        ],
        modules: vec![
            module("engine::domain", "0.2.0", "stable", "Shared object model for every client.", 0),
            module("engine::state", "0.2.0", "prototype", "Deterministic workbench snapshot.", 3),
            module("engine::inspector", "0.2.0", "stable", "Read-only, redacting summariser.", 2),
            module("engine::usage", "0.2.0", "prototype", "Token and cost accounting.", 1),
            module("engine::terminal", "0.2.0", "planned", "Sandbox pty sessions.", 1),
            module("engine::runtime", "0.2.0", "planned", "Provider execution adapters.", 1),
        ],
    }
}

fn value(key: &str, value: &str, scope: &str, secret: bool) -> ValueEntry {
    ValueEntry {
        key: key.into(),
        value: value.into(),
        scope: scope.into(),
        secret,
    }
}

fn function(name: &str, signature: &str, module: &str, permission: &str, description: &str) -> FunctionEntry {
    FunctionEntry {
        name: name.into(),
        signature: signature.into(),
        module: module.into(),
        permission: permission.into(),
        description: description.into(),
    }
}

fn module(name: &str, version: &str, status: &str, description: &str, functions: u32) -> ModuleEntry {
    ModuleEntry {
        name: name.into(),
        version: version.into(),
        status: status.into(),
        description: description.into(),
        functions,
    }
}

fn library() -> Library {
    Library {
        skills: vec![
            skill("repo-map", "Repository map", "context", "Indexes the workspace tree and keeps a short map of where things live.", "Runs once per session and refreshes on branch change. Reads paths and file names only, never file contents outside the granted mounts.", vec!["Files: workspace"], true),
            skill("diff-review", "Diff review", "review", "Reads a pending diff and comments on it before anything is written.", "Pairs with the review-before-write pattern: the agent must produce a diff, and this skill is what reads it back.", vec!["Files: workspace", "Pattern: review-before-write"], true),
            skill("design-tokens", "Design tokens", "design", "Knows the token file and refuses colour literals in a review.", "Loads desktop/src/styles/tokens.css and checks proposed CSS against it.", vec!["Files: workspace"], true),
            skill("cargo-tests", "Cargo tests", "verification", "Runs the Rust test suite and reports failures with the failing assertion.", "Needs shell approval per run until workbenchd owns the sandbox pty.", vec!["Shell: approval"], false),
            skill("accessibility-audit", "Accessibility audit", "review", "Checks contrast, focus order and hit targets on changed screens.", "Reports findings as notes; it never edits a file.", vec!["Files: workspace"], true),
            skill("changelog-writer", "Changelog writer", "writing", "Drafts release notes from commits and the changelog.", "Reads the commit list from the version-control state, not from the network.", vec!["Git: read"], true),
        ],
        patterns: vec![
            pattern("review-before-write", "Review before write", "The agent proposes a diff and waits for approval before writing.", "Every write becomes a two-step exchange; nothing lands unseen."),
            pattern("one-change-per-run", "One change per run", "A run touches a single module or file group, then stops.", "Keeps diffs reviewable and makes a failed run cheap to discard."),
            pattern("test-before-propose", "Test before propose", "The test suite must pass before a diff is offered.", "Adds a verification step and reports the failure instead of the diff when it breaks."),
            pattern("approval-for-shell", "Approval for shell", "Each shell command is presented for approval before it runs.", "Turns the shell permission from a grant into a per-command decision."),
            pattern("read-only", "Read only", "The agent may read the workspace but never write to it.", "Removes write tools from the agent entirely; findings arrive as notes."),
            pattern("report-findings", "Report findings", "Results arrive as a structured list of findings with file and line.", "Makes output reviewable and comparable between runs."),
        ],
        mcp: vec![
            mcp_server("filesystem", "Filesystem", "stdio", "connected", "Scoped file access inside the sandbox mounts.", vec!["read: workspace", "write: workspace"], Some(reference("docs", "Model Context Protocol", "https://modelcontextprotocol.io"))),
            mcp_server("git", "Git", "stdio", "connected", "Branch, status, log and diff for the workspace repository.", vec!["read: repository"], Some(reference("docs", "Model Context Protocol", "https://modelcontextprotocol.io"))),
            mcp_server("http-fetch", "HTTP fetch", "stdio", "blocked", "Fetches a URL for the agent. Blocked while the sandbox network policy is limited.", vec!["network: allowlist"], None),
            mcp_server("sqlite", "SQLite", "stdio", "available", "Reads a local database file inside the sandbox.", vec!["read: workspace"], None),
        ],
    }
}

fn skill(id: &str, name: &str, category: &str, summary: &str, detail: &str, requires: Vec<&str>, installed: bool) -> SkillCard {
    SkillCard {
        id: id.into(),
        name: name.into(),
        category: category.into(),
        summary: summary.into(),
        detail: detail.into(),
        requires: requires.into_iter().map(Into::into).collect(),
        installed,
    }
}

fn pattern(id: &str, name: &str, summary: &str, effect: &str) -> PatternCard {
    PatternCard {
        id: id.into(),
        name: name.into(),
        summary: summary.into(),
        effect: effect.into(),
    }
}

fn mcp_server(id: &str, name: &str, transport: &str, status: &str, summary: &str, scopes: Vec<&str>, reference: Option<Reference>) -> McpServer {
    McpServer {
        id: id.into(),
        name: name.into(),
        transport: transport.into(),
        status: status.into(),
        summary: summary.into(),
        scopes: scopes.into_iter().map(Into::into).collect(),
        reference,
    }
}

fn usage() -> UsageSummary {
    let by_agent: Vec<AgentUsage> = agents()
        .iter()
        .map(|agent| AgentUsage {
            agent_id: agent.id.clone(),
            name: agent.name.clone(),
            model_id: agent.model_id.clone(),
            runs: if agent.cost_usd > 0.0 { 3 } else { 0 },
            tokens: agent.tokens_in + agent.tokens_out,
            cost_usd: agent.cost_usd,
        })
        .collect();

    let by_model = vec![
        ModelUsage {
            model_id: "claude-sonnet".into(),
            name: "Claude Sonnet".into(),
            version: "provider default".into(),
            calls: 24,
            tokens_in: 14_200,
            tokens_out: 4_400,
            cost_usd: 0.43,
        },
        ModelUsage {
            model_id: "codex".into(),
            name: "Codex".into(),
            version: "provider default".into(),
            calls: 11,
            tokens_in: 28_100,
            tokens_out: 10_000,
            cost_usd: 0.94,
        },
        ModelUsage {
            model_id: "inspector-local".into(),
            name: "Open Cube Inspector".into(),
            version: "v1".into(),
            calls: 6,
            tokens_in: 0,
            tokens_out: 0,
            cost_usd: 0.0,
        },
    ];

    let tokens_in = by_model.iter().map(|m| m.tokens_in).sum();
    let tokens_out = by_model.iter().map(|m| m.tokens_out).sum();
    let cost_usd = by_model.iter().map(|m| m.cost_usd).sum::<f64>();

    // One working day of wall clock, for the duty-cycle part of utilisation.
    let window_seconds = 8.0 * 3600.0;
    let local = crate::economics::local_economics(
        &models(),
        &computer().energy,
        "claude-sonnet",
        "today",
        tokens_in,
        tokens_out,
        window_seconds,
        0,
    );

    let daily = vec![
        daily("Mon", 21_400, 0.52),
        daily("Tue", 38_900, 0.88),
        daily("Wed", 12_600, 0.29),
        daily("Thu", 44_100, 1.12),
        daily("Fri", 56_700, 1.37),
    ];

    let periods = crate::activity::periods(&by_model, &daily);

    UsageSummary {
        window: "today".into(),
        tokens_in,
        tokens_out,
        cost_usd,
        by_model,
        by_agent,
        local,
        periods,
        activity: crate::activity::calendar(&models(), 52),
        daily,
    }
}

fn daily(day: &str, tokens: u64, cost_usd: f64) -> DailyUsage {
    DailyUsage {
        day: day.into(),
        tokens,
        cost_usd,
    }
}

fn version_control() -> VersionControl {
    VersionControl {
        branch: "main".into(),
        head: commit("e56bed2", "Build Open Cube workbench shell prototype", "Rajan Bor", "today"),
        ahead: 0,
        behind: 0,
        dirty: 6,
        recent: vec![
            commit("e56bed2", "Build Open Cube workbench shell prototype", "Rajan Bor", "today"),
            commit("b1104bb", "Add canonical AI project system", "Rajan Bor", "2 days ago"),
            commit("91ed4e3", "Document Open Cube architecture and roadmap", "Rajan Bor", "3 days ago"),
        ],
        branches: vec![
            branch("main", true, 0, 0, "today"),
            branch("agent/runtime-migration", false, 4, 1, "1 h"),
            branch("agent/ui-audit", false, 2, 0, "yesterday"),
        ],
        changes: vec![
            change("desktop/engine/src/state.rs", "modified"),
            change("desktop/src/views/AgentStudioView.tsx", "added"),
            change("desktop/src/styles/tokens.css", "modified"),
            change(".ai/specs/AGENT_STUDIO.md", "added"),
        ],
    }
}

fn branch(name: &str, current: bool, ahead: u32, behind: u32, updated: &str) -> BranchRef {
    BranchRef {
        name: name.into(),
        current,
        ahead,
        behind,
        updated: updated.into(),
    }
}

fn change(path: &str, state: &str) -> FileChange {
    FileChange {
        path: path.into(),
        state: state.into(),
    }
}

fn commit(hash: &str, title: &str, author: &str, when: &str) -> Commit {
    Commit {
        hash: hash.into(),
        title: title.into(),
        author: author.into(),
        when: when.into(),
    }
}

fn inspector_policy() -> InspectorPolicy {
    InspectorPolicy {
        model_id: "inspector-local".into(),
        mode: "read-only".into(),
        egress: "none · answers never leave the machine".into(),
        scopes: vec![
            scope("agents", true, "Status, task, model, permissions and cost"),
            scope("sandboxes", true, "Isolation, mounts, network policy, processes"),
            scope("models", true, "Catalogue, pinned version and digest"),
            scope("usage", true, "Tokens and cost per model and agent"),
            scope("workspace files", false, "File contents stay inside the sandbox"),
            scope("provider credentials", false, "Never readable by any model"),
            scope("terminal input", false, "Typed commands are not forwarded to a model"),
        ],
        redactions: vec![
            "provider.token".into(),
            "api key".into(),
            "password".into(),
            "secret".into(),
        ],
    }
}

fn scope(name: &str, granted: bool, detail: &str) -> InspectorScope {
    InspectorScope {
        name: name.into(),
        granted,
        detail: detail.into(),
    }
}

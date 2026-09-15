//! The in-app inspector.
//!
//! It answers questions about the workbench from the snapshot alone. It is
//! deliberately not a language model: it reads only the objects its policy
//! grants, never file contents or credentials, and it produces no network
//! traffic. A provider or local model can be attached later behind the same
//! policy — the policy, not the model, decides what is readable.
use crate::domain::*;

/// Intent buckets the inspector recognises in a question.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Topic {
    Agents,
    Sandboxes,
    Models,
    Cost,
    Security,
    Terminals,
    Versions,
    Overview,
}

fn topic_of(question: &str) -> Topic {
    let q = question.to_lowercase();
    let has = |needles: &[&str]| needles.iter().any(|needle| q.contains(needle));

    if has(&["cost", "spend", "token", "budget", "price", "koszt"]) {
        Topic::Cost
    } else if has(&["sandbox", "isolation", "mount", "network", "piaskowni"]) {
        Topic::Sandboxes
    } else if has(&["model", "version", "digest", "pinned"]) && !has(&["agent"]) {
        Topic::Models
    } else if has(&["permission", "secure", "security", "safe", "leak", "credential", "policy"]) {
        Topic::Security
    } else if has(&["terminal", "shell", "pty", "command"]) {
        Topic::Terminals
    } else if has(&["branch", "commit", "git", "revision"]) {
        Topic::Versions
    } else if has(&["agent", "who", "doing", "status", "run"]) {
        Topic::Agents
    } else {
        Topic::Overview
    }
}

/// Scopes a question touches but the policy denies.
fn refusals(question: &str, policy: &InspectorPolicy) -> Vec<String> {
    let q = question.to_lowercase();
    let mut refused = Vec::new();
    let denied = |name: &str| {
        policy
            .scopes
            .iter()
            .any(|scope| scope.name == name && !scope.granted)
    };

    if (q.contains("file") || q.contains("code") || q.contains("read the") || q.contains("content"))
        && denied("workspace files")
    {
        refused.push("workspace files".into());
    }
    if (q.contains("key") || q.contains("token=") || q.contains("credential") || q.contains("password"))
        && denied("provider credentials")
    {
        refused.push("provider credentials".into());
    }
    if q.contains("typed") && denied("terminal input") {
        refused.push("terminal input".into());
    }
    refused
}

fn agents_line(agent: &Agent, models: &[ModelCard]) -> String {
    let model = models
        .iter()
        .find(|model| model.id == agent.model_id)
        .map(|model| model.name.as_str())
        .unwrap_or("no model");
    format!(
        "{} ({}) is {} on “{}” using {} in sandbox {} · {} tokens · ${:.2}",
        agent.name,
        agent.role.to_lowercase(),
        agent.status,
        agent.task,
        model,
        agent.sandbox_id,
        agent.tokens_in + agent.tokens_out,
        agent.cost_usd
    )
}

fn sandbox_line(sandbox: &Sandbox) -> String {
    let writable = sandbox
        .mounts
        .iter()
        .filter(|mount| mount.mode == "read-write")
        .count();
    format!(
        "{} is {} on {} · {} · network {} · {} mounts ({} writable) · {} processes",
        sandbox.name,
        sandbox.state,
        sandbox.machine,
        sandbox.isolation,
        sandbox.network.mode,
        sandbox.mounts.len(),
        writable,
        sandbox.processes.len()
    )
}

fn model_line(model: &ModelCard) -> String {
    let location = match model.location {
        ModelLocation::Local => "local",
        ModelLocation::Api => "api",
    };
    format!(
        "{} · {} · {} · version {} ({}) · {}",
        model.name,
        model.vendor,
        location,
        model.version,
        model.digest,
        if model.ready { "ready" } else { "not ready" }
    )
}

/// Removes any redacted term from an answer before it is returned.
fn redact(text: String, policy: &InspectorPolicy) -> (String, Vec<String>) {
    let mut removed = Vec::new();
    let mut out = text;
    for term in &policy.redactions {
        if out.to_lowercase().contains(&term.to_lowercase()) {
            out = out.replace(term, "[redacted]");
            removed.push(term.clone());
        }
    }
    (out, removed)
}

pub fn inspect(question: &str, snapshot: &DesktopSnapshot) -> InspectorAnswer {
    let policy = &snapshot.inspector;
    let refused = refusals(question, policy);
    let mut sources: Vec<String> = Vec::new();

    let body = match topic_of(question) {
        Topic::Agents => {
            sources.extend(snapshot.agents.iter().map(|agent| format!("agent:{}", agent.id)));
            let mut lines = vec![format!("{} agents are configured.", snapshot.agents.len())];
            lines.extend(
                snapshot
                    .agents
                    .iter()
                    .map(|agent| format!("· {}", agents_line(agent, &snapshot.models))),
            );
            lines.join("\n")
        }
        Topic::Sandboxes => {
            sources.extend(
                snapshot
                    .sandboxes
                    .iter()
                    .map(|sandbox| format!("sandbox:{}", sandbox.id)),
            );
            let mut lines = vec![format!("{} sandboxes are defined.", snapshot.sandboxes.len())];
            lines.extend(
                snapshot
                    .sandboxes
                    .iter()
                    .map(|sandbox| format!("· {}", sandbox_line(sandbox))),
            );
            lines.push(
                "I can read the policy of each sandbox, never the files inside it.".into(),
            );
            lines.join("\n")
        }
        Topic::Models => {
            sources.extend(snapshot.models.iter().map(|model| format!("model:{}", model.id)));
            let mut lines = vec![format!(
                "{} models are catalogued; every attached version is pinned by digest.",
                snapshot.models.len()
            )];
            lines.extend(snapshot.models.iter().map(|model| format!("· {}", model_line(model))));
            lines.join("\n")
        }
        Topic::Cost => {
            sources.push("usage:today".into());
            let usage = &snapshot.usage;
            let mut lines = vec![format!(
                "Spend {}: ${:.2} across {} in and {} out tokens.",
                usage.window, usage.cost_usd, usage.tokens_in, usage.tokens_out
            )];
            lines.extend(usage.by_model.iter().map(|model| {
                format!(
                    "· {} ({}) · {} calls · {} tokens · ${:.2}",
                    model.name,
                    model.version,
                    model.calls,
                    model.tokens_in + model.tokens_out,
                    model.cost_usd
                )
            }));
            lines.push("Local models and the inspector cost nothing to run.".into());
            lines.join("\n")
        }
        Topic::Security => {
            sources.push("policy:inspector".into());
            let granted: Vec<&str> = policy
                .scopes
                .iter()
                .filter(|scope| scope.granted)
                .map(|scope| scope.name.as_str())
                .collect();
            let denied: Vec<&str> = policy
                .scopes
                .iter()
                .filter(|scope| !scope.granted)
                .map(|scope| scope.name.as_str())
                .collect();
            format!(
                "I run {} with egress {}.\nReadable: {}.\nRefused: {}.\nRedacted before any answer: {}.",
                policy.mode,
                policy.egress,
                granted.join(", "),
                denied.join(", "),
                policy.redactions.join(", ")
            )
        }
        Topic::Terminals => {
            sources.extend(
                snapshot
                    .terminals
                    .iter()
                    .map(|terminal| format!("terminal:{}", terminal.id)),
            );
            let mut lines = vec![format!(
                "{} terminal panes are open, all {} from a live pty.",
                snapshot.terminals.len(),
                snapshot
                    .terminals
                    .first()
                    .map(|terminal| terminal.state.as_str())
                    .unwrap_or("detached")
            )];
            lines.extend(snapshot.terminals.iter().map(|terminal| {
                format!("· {} · {} · {} · {}", terminal.title, terminal.shell, terminal.cwd, terminal.policy)
            }));
            lines.join("\n")
        }
        Topic::Versions => {
            sources.push("vcs:head".into());
            let vcs = &snapshot.version_control;
            format!(
                "Branch {} at {} — “{}” by {} ({}). {} uncommitted files, {} ahead, {} behind.",
                vcs.branch,
                vcs.head.hash,
                vcs.head.title,
                vcs.head.author,
                vcs.head.when,
                vcs.dirty,
                vcs.ahead,
                vcs.behind
            )
        }
        Topic::Overview => {
            sources.push("snapshot".into());
            let running = snapshot
                .agents
                .iter()
                .filter(|agent| agent.status == "running")
                .count();
            let waiting = snapshot
                .agents
                .iter()
                .filter(|agent| agent.status == "waiting" || agent.status == "approval")
                .count();
            format!(
                "{} agents ({} running, {} waiting on you) across {} sandboxes on {}.\nSpend {} is ${:.2}; {} models catalogued, {} ready.\nAsk me about agents, sandboxes, models, cost, security, terminals or version control.",
                snapshot.agents.len(),
                running,
                waiting,
                snapshot.sandboxes.len(),
                snapshot.computer.device_kind,
                snapshot.usage.window,
                snapshot.usage.cost_usd,
                snapshot.models.len(),
                snapshot.models.iter().filter(|model| model.ready).count()
            )
        }
    };

    let mut text = body;
    if !refused.is_empty() {
        text.push_str(&format!(
            "\n\nRefused by policy: {}. That scope is not readable by any model.",
            refused.join(", ")
        ));
    }

    let (text, redacted) = redact(text, policy);
    let tokens = text.split_whitespace().count() as u64;

    InspectorAnswer {
        text,
        model_id: policy.model_id.clone(),
        sources,
        redacted,
        refused,
        tokens,
        cost_usd: 0.0,
    }
}

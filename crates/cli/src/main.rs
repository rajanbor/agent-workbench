//! `open-cube` — read the workbench from the terminal, and see what a launch
//! would do before anything can do it.
//!
//! This is the command that replaces `agentctl`. Everything it reports comes
//! from `open-cube-core`; everything it would run comes from
//! `open-cube-runtime`, which refuses a plan that breaks the account boundary
//! and blocks execution until `workbenchd` owns the privileged helper.
use open_cube_core::{snapshot, DesktopSnapshot};
use open_cube_runtime::{host_runtime, Action, LaunchRequest};

const USAGE: &str = "\
open-cube — the agent workbench, from the terminal

  status                 machine, runtime adapter and what is connected
  agents                 every agent, its model, sandbox and state
  sandboxes              isolation, mounts, network policy and processes
  models                 the catalogue, with pinned versions
  cost [period]          spend: hour | today | week | month
  activity               the last year of runs, per model
  ask <question>         a scoped, redacted answer from the inspector
  plan <agent> [action]  what a launch would run: start | terminal | stop
  run <agent>            attempt a launch (blocked until workbenchd exists)
  doctor                 what is missing before an agent can run
";

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let state = snapshot();

    let code = match args.first().map(String::as_str) {
        None | Some("help") | Some("-h") | Some("--help") => {
            print!("{USAGE}");
            0
        }
        Some("status") => status(&state),
        Some("agents") => agents(&state),
        Some("sandboxes") => sandboxes(&state),
        Some("models") => models(&state),
        Some("cost") => cost(&state, args.get(1).map(String::as_str).unwrap_or("today")),
        Some("activity") => activity(&state),
        Some("ask") => ask(&args[1..]),
        Some("plan") => plan(&state, args.get(1).map(String::as_str), args.get(2).map(String::as_str)),
        Some("run") => run(&state, args.get(1).map(String::as_str)),
        Some("doctor") => doctor(&state),
        Some(other) => {
            eprintln!("open-cube: unknown command {other:?}\n");
            print!("{USAGE}");
            2
        }
    };

    std::process::exit(code);
}

fn status(state: &DesktopSnapshot) -> i32 {
    let runtime = host_runtime();
    println!("machine     {} · {}/{}", state.computer.device_kind, state.computer.operating_system, state.computer.architecture);
    println!("runtime     {} · {}", runtime.name(), state.computer.runtime_status);
    println!("power       {} W budget · {} GB · {} Wh battery", state.computer.energy.power_budget_w, state.computer.energy.memory_gb, state.computer.energy.battery_wh);
    println!("branch      {} ({} uncommitted)", state.version_control.branch, state.version_control.dirty);
    println!("agents      {} configured, {} running", state.agents.len(), state.agents.iter().filter(|a| a.status == "running").count());
    println!("sandboxes   {}", state.sandboxes.iter().map(|s| format!("{} ({})", s.name, s.state)).collect::<Vec<_>>().join(", "));
    println!("providers   {}", state.providers.iter().map(|p| format!("{}: {}", p.name, if p.connected { "connected" } else { "not connected" })).collect::<Vec<_>>().join(", "));
    0
}

fn agents(state: &DesktopSnapshot) -> i32 {
    for agent in &state.agents {
        let model = state.models.iter().find(|m| m.id == agent.model_id);
        println!(
            "{:<18} {:<10} {:<22} {:<12} {} tokens · ${:.2}",
            agent.name,
            agent.status,
            model.map(|m| m.name.as_str()).unwrap_or("no model"),
            agent.sandbox_id,
            agent.tokens_in + agent.tokens_out,
            agent.cost_usd
        );
    }
    0
}

fn sandboxes(state: &DesktopSnapshot) -> i32 {
    for sandbox in &state.sandboxes {
        println!("{} · {} · {}", sandbox.name, sandbox.state, sandbox.isolation);
        println!("  network   {}{}", sandbox.network.mode, if sandbox.network.allowlist.is_empty() { String::new() } else { format!(" ({})", sandbox.network.allowlist.join(", ")) });
        for mount in &sandbox.mounts {
            println!("  mount     {} [{}]", mount.path, mount.mode);
        }
        for process in &sandbox.processes {
            println!("  process   {} {} · {} cpu · {}", process.pid, process.command, process.cpu, process.memory);
        }
    }
    0
}

fn models(state: &DesktopSnapshot) -> i32 {
    for model in &state.models {
        println!(
            "{:<26} {:<8} {:<18} {}",
            model.name,
            format!("{:?}", model.location).to_lowercase(),
            model.version,
            if model.ready { "ready" } else { "not ready" }
        );
    }
    0
}

fn cost(state: &DesktopSnapshot, period: &str) -> i32 {
    let Some(window) = state.usage.periods.iter().find(|p| p.id == period) else {
        eprintln!("open-cube: unknown period {period:?}; try hour, today, week or month");
        return 2;
    };
    println!("{} · ${:.2} · {} calls · {} tokens", window.label, window.cost_usd, window.calls, window.tokens_in + window.tokens_out);
    for row in &window.by_model {
        println!("  {:<26} {:>6} calls  {:>9} tokens  ${:.2}", row.name, row.calls, row.tokens_in + row.tokens_out, row.cost_usd);
    }
    let local = &state.usage.local;
    if let Some(best) = local.rows.iter().find(|row| Some(&row.model_id) == local.best_model_id.as_ref()) {
        println!(
            "locally: {} would take {:.0} min and {:.2} Wh ({:.1}% battery), saving ${:.2} — {}",
            best.name, best.seconds / 60.0, best.energy_wh, best.battery_pct, best.saved_usd, local.basis
        );
    }
    0
}

fn activity(state: &DesktopSnapshot) -> i32 {
    let calendar = &state.usage.activity;
    println!("{} runs between {} and {} · busiest {}", calendar.total_runs, calendar.from, calendar.to, calendar.busiest_day);
    for row in &calendar.by_model {
        let bar = "█".repeat(((row.share * 40.0).round() as usize).max(1));
        println!("  {:<26} {:>5} runs {:>5.1}% {}", row.name, row.runs, row.share * 100.0, bar);
    }
    println!("{}", calendar.basis);
    0
}

fn ask(question: &[String]) -> i32 {
    if question.is_empty() {
        eprintln!("open-cube: ask what?");
        return 2;
    }
    let answer = open_cube_core::inspect(&question.join(" "));
    println!("{}", answer.text);
    println!(
        "\n— {} · {} tokens · ${:.2}{}",
        answer.model_id,
        answer.tokens,
        answer.cost_usd,
        if answer.refused.is_empty() { String::new() } else { format!(" · refused: {}", answer.refused.join(", ")) }
    );
    0
}

fn launch_request(state: &DesktopSnapshot, agent_id: &str, action: Action) -> Option<LaunchRequest> {
    let agent = state.agents.iter().find(|a| a.id == agent_id || a.name == agent_id)?;
    let sandbox = state.sandboxes.iter().find(|s| s.id == agent.sandbox_id)?;
    let provider = state
        .models
        .iter()
        .find(|m| m.id == agent.model_id)
        .map(|m| m.vendor.to_lowercase())
        .unwrap_or_else(|| "claude".into());
    // The boundary is the account, not the sandbox's label.
    let account = sandbox.account.clone()?;
    Some(LaunchRequest {
        agent_id: agent.id.clone(),
        provider: if provider == "anthropic" { "claude".into() } else { provider },
        sandbox_user: account,
        workspace_root: agent.project.path.clone(),
        working_directory: agent.project.path.clone(),
        action,
    })
}

fn parse_action(raw: Option<&str>) -> Action {
    match raw {
        Some("terminal") => Action::Terminal,
        Some("stop") => Action::Stop,
        _ => Action::Start,
    }
}

fn plan(state: &DesktopSnapshot, agent: Option<&str>, action: Option<&str>) -> i32 {
    let Some(agent_id) = agent else {
        eprintln!("open-cube: plan which agent? see `open-cube agents`");
        return 2;
    };
    let Some(request) = launch_request(state, agent_id, parse_action(action)) else {
        eprintln!("open-cube: no agent {agent_id:?}");
        return 2;
    };

    match host_runtime().plan(&request) {
        Ok(plan) => {
            println!("{}", plan.summary);
            println!("  run       {}", plan.command_line());
            println!("  as        {}", plan.user);
            println!("  in        {}", plan.working_directory);
            println!("  env       {}", plan.environment.iter().map(|(k, v)| format!("{k}={v}")).collect::<Vec<_>>().join(" "));
            match plan.blocked_by {
                Some(reason) => {
                    println!("  blocked   {reason}");
                    0
                }
                None => 0,
            }
        }
        Err(error) => {
            eprintln!("open-cube: {error}");
            1
        }
    }
}

fn run(state: &DesktopSnapshot, agent: Option<&str>) -> i32 {
    let Some(agent_id) = agent else {
        eprintln!("open-cube: run which agent?");
        return 2;
    };
    let Some(request) = launch_request(state, agent_id, Action::Start) else {
        eprintln!("open-cube: no agent {agent_id:?}");
        return 2;
    };
    let runtime = host_runtime();
    match runtime.plan(&request).and_then(|plan| runtime.launch(&plan)) {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("open-cube: {error}");
            eprintln!("see `open-cube plan {agent_id}` for exactly what would run");
            1
        }
    }
}

fn doctor(state: &DesktopSnapshot) -> i32 {
    let mut blocking = 0;
    let mut check = |ok: bool, label: &str, detail: &str| {
        println!("{} {label}: {detail}", if ok { "ok  " } else { "wait" });
        if !ok {
            blocking += 1;
        }
    };

    let runtime = host_runtime();
    check(
        runtime.name() != "unsupported",
        "runtime adapter",
        &format!("{} on {}", runtime.name(), state.computer.operating_system),
    );
    // The built-in local runtime does not make a provider available: launching
    // an agent needs one of the provider tools signed in.
    check(
        state.providers.iter().any(|p| p.connected && p.id != "local"),
        "provider",
        &state
            .providers
            .iter()
            .map(|p| format!("{}: {}", p.name, if p.connected { "connected" } else { "not connected" }))
            .collect::<Vec<_>>()
            .join(", "),
    );
    check(
        state.models.iter().any(|m| m.ready),
        "model",
        &format!("{} of {} ready", state.models.iter().filter(|m| m.ready).count(), state.models.len()),
    );
    check(false, "execution", "workbenchd is not implemented; plans can be inspected but not run");
    check(
        state.sandboxes.iter().any(|s| s.state == "active"),
        "sandbox",
        &state.sandboxes.iter().map(|s| format!("{} ({})", s.name, s.state)).collect::<Vec<_>>().join(", "),
    );

    println!(
        "\n{} of 5 checks still block a real run.",
        blocking
    );
    0
}

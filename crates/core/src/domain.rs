//! Platform-neutral domain types shared by every Open Cube desktop client.
//!
//! The object order follows `.ai/product/INFORMATION_ARCHITECTURE.md`:
//! `Machine -> Runtime -> Sandbox -> Workspace -> Session -> Agent -> Task -> Run`.
//! Models, providers and functions are capabilities an agent is granted.
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSnapshot {
    pub computer: ComputerProfile,
    pub providers: Vec<Provider>,
    pub models: Vec<ModelCard>,
    pub agents: Vec<Agent>,
    pub sandboxes: Vec<Sandbox>,
    pub sessions: Vec<Session>,
    pub terminals: Vec<TerminalSession>,
    pub workflow: Workflow,
    pub capabilities: Capabilities,
    pub library: Library,
    pub usage: UsageSummary,
    pub version_control: VersionControl,
    pub inspector: InspectorPolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputerProfile {
    pub operating_system: String,
    pub architecture: String,
    pub device_kind: String,
    pub runtime_status: String,
    pub energy: DeviceEnergy,
}

/// What the machine can give a local model, and what that costs.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceEnergy {
    /// Sustained package power the machine can spend, in watts.
    pub power_budget_w: f64,
    pub memory_gb: f64,
    pub battery_wh: f64,
    pub price_per_kwh: f64,
    pub basis: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub detail: String,
    pub connected: bool,
}

/// A model the workbench can attach to an agent. `icon` and `accent` give every
/// model a stable visual identity across the shell.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelCard {
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub task: String,
    pub icon: String,
    pub accent: String,
    pub parameters: String,
    pub context: String,
    pub updated: String,
    pub downloads: Option<String>,
    pub likes: Option<u32>,
    pub location: ModelLocation,
    pub ready: bool,
    /// Pinned version and its content hash: version control for models.
    pub version: String,
    pub digest: String,
    pub revisions: Vec<ModelRevision>,
    pub pricing: Option<Pricing>,
    pub subscription: Option<Subscription>,
    /// Knowledge-base entry: what the model is for and what it needs.
    pub summary: String,
    pub strengths: Vec<String>,
    pub requirements: Vec<String>,
    pub license: String,
    pub reference: Reference,
    /// Present when the model can run on the device. Declared coefficients,
    /// not measurements — see `.ai/specs/LOCAL_RUN_ECONOMICS.md`.
    pub local_profile: Option<LocalProfile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalProfile {
    /// Generated tokens per second on this device class.
    pub throughput_tps: f64,
    /// How much faster prompt processing is than generation.
    pub prefill_factor: f64,
    /// Additional package power while generating, in watts.
    pub power_draw_w: f64,
    /// Resident memory while loaded, in gigabytes.
    pub memory_gb: f64,
    pub accelerator: String,
}

/// Where to read more: the weights on Hugging Face for a local model, the
/// provider's API documentation for a hosted one.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Reference {
    pub kind: String,
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ModelLocation {
    Local,
    Api,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelRevision {
    pub version: String,
    pub digest: String,
    pub published: String,
    pub note: String,
    pub pinned: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Pricing {
    pub input_per_mtok: f64,
    pub output_per_mtok: f64,
}

/// A plan paid by the month. It is money, it is simply not metered per token,
/// so it is amortised over the window being shown.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub plan: String,
    pub monthly_usd: f64,
}

/// Where a figure in the cost column comes from. Adding three kinds together
/// without saying so would be misleading, so every row carries its kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CostKind {
    /// Billed per token by the provider.
    Metered,
    /// A share of a plan paid by the month.
    Subscription,
    /// Electricity this machine spent running the model.
    Electricity,
    /// Nothing is paid for this work.
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub role: String,
    pub status: String,
    pub model_id: String,
    pub sandbox_id: String,
    pub machine: String,
    pub task: String,
    pub last_message: String,
    pub updated_at: String,
    pub accent: String,
    pub revision: String,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost_usd: f64,
    pub permissions: Vec<Permission>,
    /// What the agent works on, and the chats opened against it.
    pub project: ProjectRef,
    pub chats: Vec<ChatRef>,
    pub blueprint: AgentBlueprint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRef {
    pub name: String,
    pub path: String,
    pub branch: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRef {
    pub id: String,
    pub title: String,
    pub updated_at: String,
}

/// The editable definition of an agent: what it is told, what it may reach for
/// and which prepared behaviours it follows. Ids point into `Library`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentBlueprint {
    pub instructions: String,
    pub patterns: Vec<String>,
    pub skills: Vec<String>,
    pub mcp: Vec<String>,
    pub tools: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Permission {
    pub label: String,
    pub value: String,
    pub level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sandbox {
    pub id: String,
    pub name: String,
    pub isolation: String,
    /// The operating-system account this sandbox runs as, when it has one.
    /// This is the boundary; the name of the sandbox is not.
    pub account: Option<String>,
    pub state: String,
    pub machine: String,
    pub disk: String,
    pub mounts: Vec<Mount>,
    pub network: NetworkPolicy,
    pub processes: Vec<SandboxProcess>,
    pub agents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mount {
    pub path: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkPolicy {
    pub mode: String,
    pub allowlist: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SandboxProcess {
    pub pid: u32,
    pub command: String,
    pub cpu: String,
    pub memory: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub title: String,
    pub provider: String,
    pub project: String,
    pub status: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSession {
    pub id: String,
    pub title: String,
    pub sandbox_id: String,
    pub shell: String,
    pub cwd: String,
    pub state: String,
    /// Why this terminal is not attached to a live pty yet.
    pub policy: String,
    pub lines: Vec<TerminalLine>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalLine {
    pub stream: String,
    pub text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workflow {
    pub id: String,
    pub name: String,
    pub nodes: Vec<WorkflowNode>,
    pub edges: Vec<WorkflowEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowNode {
    pub id: String,
    pub kind: String,
    pub label: String,
    pub detail: String,
    pub status: String,
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkflowEdge {
    pub id: String,
    pub from: String,
    pub to: String,
    pub label: String,
}

/// The right rail: values, functions and modules the workbench exposes.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Capabilities {
    pub values: Vec<ValueEntry>,
    pub functions: Vec<FunctionEntry>,
    pub modules: Vec<ModuleEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValueEntry {
    pub key: String,
    pub value: String,
    pub scope: String,
    pub secret: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FunctionEntry {
    pub name: String,
    pub signature: String,
    pub module: String,
    pub permission: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModuleEntry {
    pub name: String,
    pub version: String,
    pub status: String,
    pub description: String,
    pub functions: u32,
}

/// Everything an agent can be given, described for the person choosing it.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub skills: Vec<SkillCard>,
    pub patterns: Vec<PatternCard>,
    pub mcp: Vec<McpServer>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillCard {
    pub id: String,
    pub name: String,
    pub category: String,
    pub summary: String,
    pub detail: String,
    pub requires: Vec<String>,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatternCard {
    pub id: String,
    pub name: String,
    pub summary: String,
    pub effect: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct McpServer {
    pub id: String,
    pub name: String,
    pub transport: String,
    pub status: String,
    pub summary: String,
    pub scopes: Vec<String>,
    pub reference: Option<Reference>,
}

/// How much of the machine one local run takes.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Utilisation {
    pub power_share: f64,
    pub memory_share: f64,
    pub duty_cycle: f64,
    pub score: f64,
}

/// One local model measured against the reference API model for one workload.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalRunEconomics {
    pub model_id: String,
    pub name: String,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub seconds: f64,
    pub energy_wh: f64,
    pub energy_cost_usd: f64,
    pub api_equivalent_usd: f64,
    pub saved_usd: f64,
    pub savings_ratio: f64,
    pub tokens_per_wh: f64,
    pub battery_pct: f64,
    pub ready: bool,
    pub utilisation: Utilisation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalEconomics {
    pub basis: String,
    pub window: String,
    pub price_per_kwh: f64,
    pub reference_model_id: String,
    pub workload_tokens_in: u64,
    pub workload_tokens_out: u64,
    /// Tokens that actually ran on the device in this window.
    pub realised_tokens: u64,
    pub best_model_id: Option<String>,
    pub best_saved_usd: f64,
    pub best_savings_ratio: f64,
    pub best_energy_wh: f64,
    pub best_battery_pct: f64,
    pub rows: Vec<LocalRunEconomics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSummary {
    pub window: String,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost_usd: f64,
    pub metered_usd: f64,
    pub subscription_usd: f64,
    pub electricity_usd: f64,
    pub energy_wh: f64,
    pub by_model: Vec<ModelUsage>,
    pub by_agent: Vec<AgentUsage>,
    pub daily: Vec<DailyUsage>,
    pub local: LocalEconomics,
    pub periods: Vec<UsagePeriod>,
    pub activity: ActivityCalendar,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelUsage {
    pub model_id: String,
    pub name: String,
    pub version: String,
    pub calls: u32,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost_usd: f64,
    pub cost_kind: CostKind,
    /// Energy this row spent, when it ran on the device.
    pub energy_wh: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentUsage {
    pub agent_id: String,
    pub name: String,
    pub model_id: String,
    pub runs: u32,
    pub tokens: u64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyUsage {
    pub day: String,
    pub tokens: u64,
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionControl {
    pub branch: String,
    pub head: Commit,
    pub ahead: u32,
    pub behind: u32,
    pub dirty: u32,
    pub recent: Vec<Commit>,
    pub branches: Vec<BranchRef>,
    pub changes: Vec<FileChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchRef {
    pub name: String,
    pub current: bool,
    pub ahead: u32,
    pub behind: u32,
    pub updated: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    pub state: String,
}

/// One window the cost chip can show, with its own rows.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsagePeriod {
    pub id: String,
    pub label: String,
    pub tokens_in: u64,
    pub tokens_out: u64,
    pub cost_usd: f64,
    pub calls: u32,
    /// The total split by where the money goes.
    pub metered_usd: f64,
    pub subscription_usd: f64,
    pub electricity_usd: f64,
    pub energy_wh: f64,
    pub by_model: Vec<ModelUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityDay {
    pub date: String,
    /// 0 = Monday.
    pub weekday: u8,
    pub runs: u32,
    pub tokens: u64,
    pub cost_usd: f64,
    /// 0-4, the intensity a calendar cell is drawn with.
    pub level: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityWeek {
    pub start_date: String,
    pub days: Vec<ActivityDay>,
}

/// Activity attributed to one model, the way a profile splits contributions
/// between organisations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelActivity {
    pub model_id: String,
    pub name: String,
    pub runs: u32,
    pub tokens: u64,
    pub cost_usd: f64,
    pub share: f64,
    pub days_active: u32,
}

/// A kind of work, for the overview beside the calendar.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityKind {
    pub name: String,
    pub count: u32,
    pub share: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityCalendar {
    pub basis: String,
    pub from: String,
    pub to: String,
    pub weeks: Vec<ActivityWeek>,
    pub max_runs: u32,
    pub total_runs: u32,
    pub total_tokens: u64,
    pub busiest_day: String,
    pub by_model: Vec<ModelActivity>,
    /// What the work was, counted from the objects that hold it.
    pub by_kind: Vec<ActivityKind>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub hash: String,
    pub title: String,
    pub author: String,
    pub when: String,
}

/// What the in-app inspector model may read. Everything outside `scopes` is
/// refused, and every `redaction` is removed before text reaches the model.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorPolicy {
    pub model_id: String,
    pub mode: String,
    pub egress: String,
    pub scopes: Vec<InspectorScope>,
    pub redactions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorScope {
    pub name: String,
    pub granted: bool,
    pub detail: String,
}

/// Answer returned by the local inspector: text plus the objects it read.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InspectorAnswer {
    pub text: String,
    pub model_id: String,
    pub sources: Vec<String>,
    pub redacted: Vec<String>,
    pub refused: Vec<String>,
    pub tokens: u64,
    pub cost_usd: f64,
}

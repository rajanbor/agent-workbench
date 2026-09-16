//! The launch contract: what is asked for, what would run, and why it will not.
use serde::{Deserialize, Serialize};

use crate::guard::BoundaryError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Action {
    /// Start the provider's own tool inside the sandbox.
    Start,
    /// Attach a terminal to the sandbox account.
    Terminal,
    /// Stop everything running for this agent.
    Stop,
}

/// What the caller wants. Paths are as the user wrote them; the guards decide
/// whether they may be used.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchRequest {
    pub agent_id: String,
    pub provider: String,
    pub sandbox_user: String,
    pub workspace_root: String,
    pub working_directory: String,
    pub action: Action,
}

/// Exactly what would be executed, once something is allowed to execute it.
///
/// The environment is an allowlist built from nothing: the desktop user's
/// environment is never inherited, and no credential is ever placed here.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchPlan {
    pub program: String,
    pub args: Vec<String>,
    pub user: String,
    pub working_directory: String,
    pub environment: Vec<(String, String)>,
    /// One sentence a person can read before allowing this.
    pub summary: String,
    /// Why it cannot run yet, when that is the case.
    pub blocked_by: Option<String>,
}

impl LaunchPlan {
    pub fn is_blocked(&self) -> bool {
        self.blocked_by.is_some()
    }

    /// The plan as a shell-ish line, for showing a person what would happen.
    pub fn command_line(&self) -> String {
        let args = self
            .args
            .iter()
            .map(|arg| {
                if arg.contains(' ') {
                    format!("\"{arg}\"")
                } else {
                    arg.clone()
                }
            })
            .collect::<Vec<_>>()
            .join(" ");
        format!("{} {}", self.program, args).trim_end().to_string()
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RuntimeError {
    /// The request would break the account boundary.
    Boundary(BoundaryError),
    /// The platform has no adapter yet.
    Unsupported(String),
    /// The plan is sound but nothing may execute it yet.
    Blocked(String),
}

impl std::fmt::Display for RuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuntimeError::Boundary(error) => write!(f, "{error}"),
            RuntimeError::Unsupported(os) => {
                write!(f, "no runtime adapter for {os} yet")
            }
            RuntimeError::Blocked(reason) => write!(f, "refusing to launch: {reason}"),
        }
    }
}

impl std::error::Error for RuntimeError {}

impl From<BoundaryError> for RuntimeError {
    fn from(error: BoundaryError) -> Self {
        RuntimeError::Boundary(error)
    }
}

pub trait Runtime: Send + Sync {
    /// Name of the adapter, for diagnostics.
    fn name(&self) -> &'static str;

    /// Build the plan, refusing anything that would break the boundary.
    fn plan(&self, request: &LaunchRequest) -> Result<LaunchPlan, RuntimeError>;

    /// Execute a plan. No adapter does this yet: switching user needs the
    /// privileged helper in `workbenchd`.
    fn launch(&self, plan: &LaunchPlan) -> Result<(), RuntimeError> {
        Err(RuntimeError::Blocked(
            plan.blocked_by
                .clone()
                .unwrap_or_else(|| "execution is not implemented".into()),
        ))
    }
}

/// Stands in on a platform with no adapter, so callers still get a reason.
pub struct Unsupported {
    os: String,
}

impl Unsupported {
    pub fn new(os: &str) -> Self {
        Self { os: os.to_string() }
    }
}

impl Runtime for Unsupported {
    fn name(&self) -> &'static str {
        "unsupported"
    }

    fn plan(&self, _request: &LaunchRequest) -> Result<LaunchPlan, RuntimeError> {
        Err(RuntimeError::Unsupported(self.os.clone()))
    }
}

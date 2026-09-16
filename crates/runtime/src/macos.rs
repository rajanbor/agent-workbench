//! macOS adapter: the agent runs as a separate standard account.
//!
//! The plan is built and checked here; running it needs a privileged helper,
//! because switching account is not something the desktop app may do on its
//! own. Until `workbenchd` owns that helper, every plan carries the reason it
//! is blocked.
use crate::guard::Guarded;
use crate::plan::{Action, LaunchPlan, LaunchRequest, Runtime, RuntimeError};

const BLOCKED: &str =
    "switching to the agent account needs the privileged helper in workbenchd, which is not implemented";

#[derive(Default)]
pub struct MacosRuntime {
    /// The account this process runs as; overridable so tests do not depend on
    /// who is logged in.
    desktop_user: Option<String>,
}

impl MacosRuntime {
    pub fn as_user(desktop_user: &str) -> Self {
        Self {
            desktop_user: Some(desktop_user.to_string()),
        }
    }

    fn desktop_user(&self) -> String {
        self.desktop_user
            .clone()
            .or_else(|| std::env::var("USER").ok())
            .unwrap_or_else(|| "unknown".into())
    }
}

impl Runtime for MacosRuntime {
    fn name(&self) -> &'static str {
        "macos-account"
    }

    fn plan(&self, request: &LaunchRequest) -> Result<LaunchPlan, RuntimeError> {
        let user = Guarded::account(&request.sandbox_user, &self.desktop_user())?;
        let cwd = Guarded::directory(&request.working_directory, &request.workspace_root)?;

        // Built, not inherited: the agent gets what it needs and nothing else.
        let environment = Guarded::environment(vec![
            ("HOME".into(), format!("/Users/{user}")),
            ("USER".into(), user.clone()),
            ("SHELL".into(), "/bin/zsh".into()),
            ("PATH".into(), "/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin".into()),
            ("OPEN_CUBE_WORKSPACE".into(), request.workspace_root.clone()),
            ("OPEN_CUBE_AGENT".into(), request.agent_id.clone()),
        ])?;

        let (program, args, summary) = match request.action {
            Action::Start => (
                request.provider.clone(),
                vec!["--workspace".into(), request.workspace_root.clone()],
                format!(
                    "Run {} for {} as {user}, with the workspace as its only writable path",
                    request.provider, request.agent_id
                ),
            ),
            Action::Terminal => (
                "/bin/zsh".into(),
                vec!["-l".into()],
                format!("Open a login shell as {user} inside {}", request.workspace_root),
            ),
            Action::Stop => (
                "/usr/bin/pkill".into(),
                vec!["-u".into(), user.clone(), "-f".into(), request.provider.clone()],
                format!("Stop every {} process owned by {user}", request.provider),
            ),
        };

        Ok(LaunchPlan {
            program,
            args,
            user,
            working_directory: cwd.to_string_lossy().into_owned(),
            environment,
            summary,
            blocked_by: Some(BLOCKED.to_string()),
        })
    }
}

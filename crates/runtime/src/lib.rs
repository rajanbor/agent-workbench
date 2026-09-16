//! How an agent is launched, and what must be true before it is.
//!
//! The boundary Open Cube relies on is the operating system account: an agent
//! runs as a separate standard user with no access to the desktop user's home,
//! keychain or environment. This crate owns that contract in Rust, so the same
//! rules hold on every platform instead of living in one macOS app.
//!
//! Execution itself is not implemented here. Switching user needs a privileged
//! helper, which belongs to `workbenchd` (#9); until it exists, every adapter
//! produces a *plan* that can be inspected and refuses to run it. A plan that
//! would break the boundary is refused while it is being built, not later.
pub mod guard;
pub mod plan;

pub use guard::{BoundaryError, Guarded};
pub use plan::{Action, LaunchPlan, LaunchRequest, Runtime, RuntimeError};

#[cfg(target_os = "macos")]
pub mod macos;

/// The adapter for the machine this binary runs on.
pub fn host_runtime() -> Box<dyn Runtime> {
    #[cfg(target_os = "macos")]
    {
        Box::new(macos::MacosRuntime::default())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Box::new(plan::Unsupported::new(std::env::consts::OS))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::guard::BoundaryError;

    fn request() -> LaunchRequest {
        LaunchRequest {
            agent_id: "chief".into(),
            provider: "claude".into(),
            sandbox_user: "agent".into(),
            workspace_root: "/Users/agent/Projects/open-cube".into(),
            working_directory: "/Users/agent/Projects/open-cube".into(),
            action: Action::Start,
        }
    }

    #[cfg(target_os = "macos")]
    fn runtime() -> macos::MacosRuntime {
        macos::MacosRuntime::as_user("rajan")
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn a_plan_says_what_would_run_and_why_it_will_not() {
        let plan = runtime().plan(&request()).expect("a valid request plans");
        assert_eq!(plan.user, "agent");
        assert!(plan.command_line().starts_with("claude"));
        assert!(plan.is_blocked(), "nothing may execute yet");
        assert!(plan.blocked_by.unwrap().contains("workbenchd"));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn refuses_to_run_as_the_desktop_account() {
        let mut req = request();
        req.sandbox_user = "rajan".into();
        assert_eq!(
            runtime().plan(&req).unwrap_err(),
            RuntimeError::Boundary(BoundaryError::SameAccountAsDesktop { user: "rajan".into() })
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn refuses_root_and_nonsense_accounts() {
        for user in ["root", "", "  ", "-rf", "two words"] {
            let mut req = request();
            req.sandbox_user = user.into();
            assert!(
                matches!(
                    runtime().plan(&req),
                    Err(RuntimeError::Boundary(BoundaryError::InvalidAccount { .. }))
                ),
                "{user:?} should be refused"
            );
        }
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn refuses_a_directory_outside_the_workspace() {
        let mut req = request();
        req.working_directory = "/Users/agent/Documents".into();
        assert!(matches!(
            runtime().plan(&req),
            Err(RuntimeError::Boundary(BoundaryError::OutsideWorkspace { .. }))
        ));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn refuses_a_path_that_walks_upward() {
        let mut req = request();
        req.working_directory = "/Users/agent/Projects/open-cube/../../.ssh".into();
        assert!(matches!(
            runtime().plan(&req),
            Err(RuntimeError::Boundary(BoundaryError::PathEscapes { .. }))
        ));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn the_environment_is_built_and_carries_no_credential() {
        let plan = runtime().plan(&request()).unwrap();
        let keys: Vec<&str> = plan.environment.iter().map(|(key, _)| key.as_str()).collect();
        assert_eq!(
            keys,
            vec!["HOME", "USER", "SHELL", "PATH", "OPEN_CUBE_WORKSPACE", "OPEN_CUBE_AGENT"]
        );
        assert!(plan.environment.iter().all(|(key, _)| {
            let upper = key.to_uppercase();
            !upper.contains("TOKEN") && !upper.contains("KEY") && !upper.contains("SECRET")
        }));
        assert_eq!(
            plan.environment
                .iter()
                .find(|(key, _)| key == "HOME")
                .map(|(_, value)| value.as_str()),
            Some("/Users/agent")
        );
    }

    #[test]
    fn credentials_and_session_variables_are_refused_outright() {
        assert!(matches!(
            Guarded::environment(vec![("ANTHROPIC_API_KEY".into(), "sk-live".into())]),
            Err(BoundaryError::CredentialInEnvironment { .. })
        ));
        assert!(matches!(
            Guarded::environment(vec![("SSH_AUTH_SOCK".into(), "/tmp/agent.sock".into())]),
            Err(BoundaryError::InheritedEnvironment { .. })
        ));
    }

    #[test]
    fn launching_a_blocked_plan_fails_with_the_reason() {
        let plan = LaunchPlan {
            program: "claude".into(),
            args: vec![],
            user: "agent".into(),
            working_directory: "/Users/agent".into(),
            environment: vec![],
            summary: "test".into(),
            blocked_by: Some("workbenchd is not implemented".into()),
        };
        let error = plan::Unsupported::new("test").launch(&plan).unwrap_err();
        assert!(matches!(error, RuntimeError::Blocked(reason) if reason.contains("workbenchd")));
    }
}

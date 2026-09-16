//! The rules a launch must satisfy before a plan exists.
//!
//! These are deliberately blunt. A plan that cannot be proven safe is refused;
//! there is no "warn and continue". Every rule here has a test that tries to
//! break it.
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BoundaryError {
    /// The agent account is the desktop account, so there is no boundary.
    SameAccountAsDesktop { user: String },
    /// An empty or obviously wrong account name.
    InvalidAccount { user: String },
    /// The working directory is not inside the workspace it claims.
    OutsideWorkspace { path: String, workspace: String },
    /// A path that walks upward, which cannot be checked by prefix alone.
    PathEscapes { path: String },
    /// Something that looks like a secret was about to be handed to a process.
    CredentialInEnvironment { key: String },
    /// A variable inherited from the desktop session.
    InheritedEnvironment { key: String },
}

impl std::fmt::Display for BoundaryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BoundaryError::SameAccountAsDesktop { user } => write!(
                f,
                "refusing to run as {user}: the agent account must not be the desktop account"
            ),
            BoundaryError::InvalidAccount { user } => {
                write!(f, "refusing to run as {user:?}: not a usable account name")
            }
            BoundaryError::OutsideWorkspace { path, workspace } => write!(
                f,
                "refusing {path}: outside the workspace {workspace}"
            ),
            BoundaryError::PathEscapes { path } => {
                write!(f, "refusing {path}: the path walks outside its root")
            }
            BoundaryError::CredentialInEnvironment { key } => write!(
                f,
                "refusing to pass {key} to the agent: credentials stay with the provider tool"
            ),
            BoundaryError::InheritedEnvironment { key } => write!(
                f,
                "refusing to inherit {key} from this session: the agent gets an explicit environment"
            ),
        }
    }
}

impl std::error::Error for BoundaryError {}

/// Values that passed their checks.
pub struct Guarded;

impl Guarded {
    /// The account that will own the process must exist as a name and must not
    /// be the account running this binary.
    pub fn account(user: &str, desktop_user: &str) -> Result<String, BoundaryError> {
        let trimmed = user.trim();
        if trimmed.is_empty()
            || trimmed == "root"
            || trimmed.contains(char::is_whitespace)
            || trimmed.starts_with('-')
        {
            return Err(BoundaryError::InvalidAccount {
                user: user.to_string(),
            });
        }
        if trimmed == desktop_user.trim() {
            return Err(BoundaryError::SameAccountAsDesktop {
                user: trimmed.to_string(),
            });
        }
        Ok(trimmed.to_string())
    }

    /// The working directory must be inside the workspace, by components rather
    /// than by string prefix, so `/work/../etc` cannot pass.
    pub fn directory(path: &str, workspace: &str) -> Result<PathBuf, BoundaryError> {
        let normalise = |raw: &str| -> Result<PathBuf, BoundaryError> {
            let mut out = PathBuf::new();
            for component in Path::new(raw).components() {
                match component {
                    Component::ParentDir => {
                        return Err(BoundaryError::PathEscapes {
                            path: raw.to_string(),
                        })
                    }
                    Component::CurDir => {}
                    other => out.push(other.as_os_str()),
                }
            }
            Ok(out)
        };

        let root = normalise(workspace)?;
        let target = normalise(path)?;
        if !target.starts_with(&root) {
            return Err(BoundaryError::OutsideWorkspace {
                path: path.to_string(),
                workspace: workspace.to_string(),
            });
        }
        Ok(target)
    }

    /// The environment is built, never inherited. Anything that smells of a
    /// credential is refused outright.
    pub fn environment(
        pairs: Vec<(String, String)>,
    ) -> Result<Vec<(String, String)>, BoundaryError> {
        const SECRET_MARKERS: [&str; 7] = [
            "TOKEN", "SECRET", "PASSWORD", "API_KEY", "APIKEY", "CREDENTIAL", "SESSION_KEY",
        ];
        const SESSION_MARKERS: [&str; 6] = [
            "SSH_AUTH_SOCK",
            "XPC_SERVICE_NAME",
            "TMPDIR",
            "SECURITYSESSIONID",
            "DISPLAY",
            "DBUS_SESSION_BUS_ADDRESS",
        ];

        for (key, _) in &pairs {
            let upper = key.to_uppercase();
            if SECRET_MARKERS.iter().any(|marker| upper.contains(marker)) {
                return Err(BoundaryError::CredentialInEnvironment { key: key.clone() });
            }
            if SESSION_MARKERS.iter().any(|marker| upper == *marker) {
                return Err(BoundaryError::InheritedEnvironment { key: key.clone() });
            }
        }
        Ok(pairs)
    }
}

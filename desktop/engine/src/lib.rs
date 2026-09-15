//! Shared, platform-neutral domain model for Open Cube.
//! Platform adapters live outside of this crate so the UI and policy layer
//! can stay consistent on macOS, Windows, and Linux.
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSnapshot {
    pub computer: ComputerProfile,
    pub providers: Vec<Provider>,
    pub models: Vec<LocalModel>,
    pub sessions: Vec<Session>,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputerProfile {
    pub operating_system: String,
    pub architecture: String,
    pub device_kind: String,
    pub runtime_status: String,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub detail: String,
    pub connected: bool,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalModel {
    pub name: String,
    pub size: String,
    pub memory_hint: String,
    pub ready: bool,
}
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: String,
    pub title: String,
    pub provider: String,
    pub project: String,
    pub status: String,
    pub updated_at: String,
}

pub fn snapshot() -> DesktopSnapshot {
    DesktopSnapshot {
        computer: ComputerProfile {
            operating_system: std::env::consts::OS.into(),
            architecture: std::env::consts::ARCH.into(),
            device_kind: device_kind().into(),
            runtime_status: "Host runtime ready".into(),
        },
        providers: vec![
            Provider {
                id: "codex".into(),
                name: "Codex".into(),
                detail: "Connect with your existing subscription".into(),
                connected: false,
            },
            Provider {
                id: "claude".into(),
                name: "Claude".into(),
                detail: "Connect with your existing subscription".into(),
                connected: false,
            },
            Provider {
                id: "gemini".into(),
                name: "Gemini".into(),
                detail: "Provider adapter planned".into(),
                connected: false,
            },
        ],
        models: vec![
            LocalModel {
                name: "Qwen 2.5 7B Instruct".into(),
                size: "4.7 GB".into(),
                memory_hint: "8 GB unified memory".into(),
                ready: false,
            },
            LocalModel {
                name: "Llama 3.2 3B Instruct".into(),
                size: "2.0 GB".into(),
                memory_hint: "6 GB unified memory".into(),
                ready: false,
            },
            LocalModel {
                name: "Mistral 7B Instruct".into(),
                size: "4.1 GB".into(),
                memory_hint: "8 GB unified memory".into(),
                ready: false,
            },
        ],
        sessions: vec![
            Session {
                id: "welcome".into(),
                title: "Welcome to Open Cube".into(),
                provider: "Workspace".into(),
                project: "No project selected".into(),
                status: "Ready".into(),
                updated_at: "Now".into(),
            },
            Session {
                id: "research".into(),
                title: "Product research".into(),
                provider: "Codex".into(),
                project: "Open Cube".into(),
                status: "Paused".into(),
                updated_at: "Earlier".into(),
            },
        ],
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
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn snapshot_is_safe_without_provider_login() {
        let s = snapshot();
        assert!(!s.providers.is_empty());
        assert!(s.providers.iter().all(|p| !p.connected));
        assert!(!s.computer.operating_system.is_empty());
    }
}

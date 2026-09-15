use open_cube_engine::{DesktopSnapshot, InspectorAnswer};

/// Read-only workbench state for the shell.
#[tauri::command]
fn desktop_snapshot() -> DesktopSnapshot {
    open_cube_engine::snapshot()
}

/// Scoped, redacted answer from the built-in inspector. The question never
/// leaves the machine and the inspector cannot read files or credentials.
#[tauri::command]
fn inspector_ask(question: String) -> InspectorAnswer {
    open_cube_engine::inspect(&question)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_snapshot, inspector_ask])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

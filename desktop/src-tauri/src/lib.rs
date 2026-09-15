#[tauri::command]
fn desktop_snapshot() -> agent_workbench_engine::DesktopSnapshot {
    agent_workbench_engine::snapshot()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_snapshot])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

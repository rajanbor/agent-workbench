#[tauri::command]
fn desktop_snapshot() -> open_cube_engine::DesktopSnapshot {
    open_cube_engine::snapshot()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_snapshot])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

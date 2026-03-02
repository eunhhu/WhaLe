#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod state;

use state::store_state::StoreManager;

fn main() {
    tauri::Builder::default()
        .manage(StoreManager::new(None))
        .invoke_handler(tauri::generate_handler![
            commands::store_cmd::store_register,
            commands::store_cmd::store_get,
            commands::store_cmd::store_set,
            commands::store_cmd::store_get_all,
            commands::window_cmd::window_show,
            commands::window_cmd::window_hide,
            commands::window_cmd::window_toggle,
            commands::window_cmd::window_close,
            commands::window_cmd::window_set_position,
            commands::window_cmd::window_set_size,
            commands::window_cmd::window_set_always_on_top,
            commands::window_cmd::window_center,
            commands::window_cmd::window_is_visible,
            commands::window_cmd::window_create,
        ])
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

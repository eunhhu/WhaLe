use crate::state::input_state::{HotkeyEntry, InputManager};
use crate::state::store_state::StoreManager;
use serde_json::Value;
use std::collections::HashMap;
use tauri::State;

/// Return all registered stores and their current values
#[tauri::command]
pub fn devtools_list_stores(
    store_manager: State<'_, StoreManager>,
) -> HashMap<String, HashMap<String, Value>> {
    store_manager.list_all()
}

/// Return all registered hotkeys
#[tauri::command]
pub fn devtools_list_hotkeys(input_manager: State<'_, InputManager>) -> Vec<HotkeyEntry> {
    input_manager.list_hotkeys()
}

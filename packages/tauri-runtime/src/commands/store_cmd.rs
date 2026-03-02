use crate::state::store_state::StoreManager;
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};

#[tauri::command]
pub fn store_register(
    store_manager: State<'_, StoreManager>,
    name: String,
    defaults: HashMap<String, Value>,
) {
    store_manager.register(&name, defaults);
}

#[tauri::command]
pub fn store_get(
    store_manager: State<'_, StoreManager>,
    name: String,
) -> Option<HashMap<String, Value>> {
    store_manager.get(&name)
}

#[tauri::command]
pub fn store_set(
    app: AppHandle,
    store_manager: State<'_, StoreManager>,
    name: String,
    key: String,
    value: Value,
) {
    if let Some(patch) = store_manager.set(&name, &key, value) {
        let payload = serde_json::json!({
            "store": name,
            "patch": patch,
        });
        let _ = app.emit("store:changed", &payload);
    }
}

#[tauri::command]
pub fn store_get_all(
    store_manager: State<'_, StoreManager>,
    name: String,
) -> Option<HashMap<String, Value>> {
    store_manager.get(&name)
}

use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct StoreManager {
    stores: Mutex<HashMap<String, HashMap<String, Value>>>,
    persist_path: Option<PathBuf>,
}

impl StoreManager {
    pub fn new(persist_path: Option<PathBuf>) -> Self {
        let stores = if let Some(ref path) = persist_path {
            if path.exists() {
                let data = fs::read_to_string(path).unwrap_or_default();
                serde_json::from_str(&data).unwrap_or_default()
            } else {
                HashMap::new()
            }
        } else {
            HashMap::new()
        };

        Self {
            stores: Mutex::new(stores),
            persist_path,
        }
    }

    pub fn register(&self, name: &str, defaults: HashMap<String, Value>) {
        let mut stores = self.stores.lock().unwrap();
        stores.entry(name.to_string()).or_insert(defaults);
    }

    pub fn get(&self, name: &str) -> Option<HashMap<String, Value>> {
        let stores = self.stores.lock().unwrap();
        stores.get(name).cloned()
    }

    pub fn set(&self, name: &str, key: &str, value: Value) -> Option<HashMap<String, Value>> {
        let mut stores = self.stores.lock().unwrap();
        if let Some(store) = stores.get_mut(name) {
            store.insert(key.to_string(), value.clone());
            let mut patch = HashMap::new();
            patch.insert(key.to_string(), value);
            Some(patch)
        } else {
            None
        }
    }

    pub fn merge_patch(&self, name: &str, patch: HashMap<String, Value>) -> bool {
        let mut stores = self.stores.lock().unwrap();
        if let Some(store) = stores.get_mut(name) {
            for (k, v) in patch {
                store.insert(k, v);
            }
            true
        } else {
            false
        }
    }

    pub fn persist(&self) {
        if let Some(ref path) = self.persist_path {
            let stores = self.stores.lock().unwrap();
            if let Ok(data) = serde_json::to_string_pretty(&*stores) {
                let _ = fs::create_dir_all(path.parent().unwrap_or(path));
                let _ = fs::write(path, data);
            }
        }
    }
}

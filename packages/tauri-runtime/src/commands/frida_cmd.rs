use crate::preamble;
use crate::state::frida_state::{
    DeviceInfoData, FridaManager, FridaRequest, FridaResponse, FridaSender, ProcessInfoData,
    SpawnAttachData,
};
use crate::state::store_state::StoreManager;
use tauri::{AppHandle, Emitter, State};

// ---------------------------------------------------------------------------
// Helper: send a request to the frida worker and extract the typed response
// ---------------------------------------------------------------------------

fn request_devices(frida: &FridaSender) -> Result<Vec<DeviceInfoData>, String> {
    match frida.send(|reply| FridaRequest::ListDevices { reply }) {
        FridaResponse::Devices(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_processes(
    frida: &FridaSender,
    device_id: String,
) -> Result<Vec<ProcessInfoData>, String> {
    match frida.send(|reply| FridaRequest::EnumerateProcesses { device_id, reply }) {
        FridaResponse::Processes(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_spawn(frida: &FridaSender, device_id: String, program: String) -> Result<u32, String> {
    match frida.send(|reply| FridaRequest::Spawn {
        device_id,
        program,
        reply,
    }) {
        FridaResponse::Pid(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_spawn_attach(
    frida: &FridaSender,
    device_id: String,
    program: String,
) -> Result<SpawnAttachData, String> {
    match frida.send(|reply| FridaRequest::SpawnAttach {
        device_id,
        program,
        reply,
    }) {
        FridaResponse::SpawnAttach(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_resume(frida: &FridaSender, device_id: String, pid: u32) -> Result<(), String> {
    match frida.send(|reply| FridaRequest::Resume {
        device_id,
        pid,
        reply,
    }) {
        FridaResponse::Unit(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_attach(frida: &FridaSender, device_id: String, pid: u32) -> Result<String, String> {
    match frida.send(|reply| FridaRequest::Attach {
        device_id,
        pid,
        reply,
    }) {
        FridaResponse::SessionId(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_load_script(
    frida: &FridaSender,
    session_id: String,
    code: String,
    store_name: Option<String>,
) -> Result<String, String> {
    match frida.send(|reply| FridaRequest::LoadScript {
        session_id,
        code,
        store_name,
        reply,
    }) {
        FridaResponse::ScriptId(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_unload_script(frida: &FridaSender, script_id: String) -> Result<(), String> {
    match frida.send(|reply| FridaRequest::UnloadScript { script_id, reply }) {
        FridaResponse::Unit(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn request_detach(frida: &FridaSender, session_id: String) -> Result<(), String> {
    match frida.send(|reply| FridaRequest::Detach { session_id, reply }) {
        FridaResponse::Unit(r) => r,
        _ => Err("Unexpected response type".to_string()),
    }
}

fn resolve_spawn_target(
    program: Option<String>,
    bundle_id: Option<String>,
) -> Result<String, String> {
    program
        .or(bundle_id)
        .ok_or_else(|| "Missing required spawn target: provide program (or bundleId)".to_string())
}

fn emit_devtools_frida_log(app: &AppHandle, level: &str, message: String) {
    if cfg!(debug_assertions) {
        let _ = app.emit(
            "devtools:log",
            &serde_json::json!({
                "source": "frida",
                "level": level,
                "message": message,
            }),
        );
    }
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// List all frida devices
#[tauri::command]
pub async fn frida_list_devices(
    frida: State<'_, FridaManager>,
) -> Result<Vec<DeviceInfoData>, String> {
    let sender = frida.inner().clone_sender();
    tauri::async_runtime::spawn_blocking(move || request_devices(&sender))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Enumerate processes on a device
#[tauri::command]
pub async fn frida_enumerate_processes(
    frida: State<'_, FridaManager>,
    device_id: String,
) -> Result<Vec<ProcessInfoData>, String> {
    let sender = frida.inner().clone_sender();
    tauri::async_runtime::spawn_blocking(move || request_processes(&sender, device_id))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Spawn a process on a device
#[tauri::command]
pub async fn frida_spawn(
    app: AppHandle,
    frida: State<'_, FridaManager>,
    device_id: String,
    program: Option<String>,
    bundle_id: Option<String>,
) -> Result<u32, String> {
    let target_program = resolve_spawn_target(program, bundle_id)?;
    let sender = frida.inner().clone_sender();
    let log_device_id = device_id.clone();
    let log_target_program = target_program.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        request_spawn(&sender, device_id, target_program)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match &result {
        Ok(pid) => emit_devtools_frida_log(
            &app,
            "info",
            format!(
                "spawn succeeded device={} program={} pid={}",
                log_device_id, log_target_program, pid
            ),
        ),
        Err(err) => emit_devtools_frida_log(
            &app,
            "error",
            format!(
                "spawn failed device={} program={} error={}",
                log_device_id, log_target_program, err
            ),
        ),
    }

    result
}

/// Spawn and immediately attach on a device in one IPC round-trip.
#[tauri::command]
pub async fn frida_spawn_attach(
    app: AppHandle,
    frida: State<'_, FridaManager>,
    device_id: String,
    program: Option<String>,
    bundle_id: Option<String>,
) -> Result<SpawnAttachData, String> {
    let target_program = resolve_spawn_target(program, bundle_id)?;
    let sender = frida.inner().clone_sender();
    let log_device_id = device_id.clone();
    let log_target_program = target_program.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        request_spawn_attach(&sender, device_id, target_program)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match &result {
        Ok(data) => emit_devtools_frida_log(
            &app,
            "info",
            format!(
                "spawn_attach succeeded device={} program={} pid={} session={}",
                log_device_id, log_target_program, data.pid, data.session_id
            ),
        ),
        Err(err) => emit_devtools_frida_log(
            &app,
            "error",
            format!(
                "spawn_attach failed device={} program={} error={}",
                log_device_id, log_target_program, err
            ),
        ),
    }

    result
}

/// Resume a spawned process
#[tauri::command]
pub async fn frida_resume(
    frida: State<'_, FridaManager>,
    device_id: String,
    pid: u32,
) -> Result<(), String> {
    let sender = frida.inner().clone_sender();
    tauri::async_runtime::spawn_blocking(move || request_resume(&sender, device_id, pid))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Attach to a process on a device
#[tauri::command]
pub async fn frida_attach(
    app: AppHandle,
    frida: State<'_, FridaManager>,
    device_id: String,
    pid: u32,
) -> Result<String, String> {
    let sender = frida.inner().clone_sender();
    let log_device_id = device_id.clone();
    let result =
        tauri::async_runtime::spawn_blocking(move || request_attach(&sender, device_id, pid))
            .await
            .map_err(|e| format!("Task join error: {}", e))?;

    match &result {
        Ok(session_id) => emit_devtools_frida_log(
            &app,
            "info",
            format!(
                "attach succeeded device={} pid={} session={}",
                log_device_id, pid, session_id
            ),
        ),
        Err(err) => emit_devtools_frida_log(
            &app,
            "error",
            format!(
                "attach failed device={} pid={} error={}",
                log_device_id, pid, err
            ),
        ),
    }

    result
}

/// Load a script into a session, with optional __whale_store__ preamble
#[tauri::command]
pub async fn frida_load_script(
    app: AppHandle,
    frida: State<'_, FridaManager>,
    store_manager: State<'_, StoreManager>,
    session_id: String,
    code: String,
    store_name: Option<String>,
) -> Result<String, String> {
    // Build final code with preamble if store_name is provided
    let final_code = if let Some(ref name) = store_name {
        let initial_state = store_manager
            .get(name)
            .map(|s| serde_json::to_string(&s).unwrap_or_default())
            .unwrap_or_else(|| "{}".to_string());
        let preamble_code = preamble::generate(name, &initial_state);
        format!("{}\n\n{}", preamble_code, code)
    } else {
        code
    };

    let sender = frida.inner().clone_sender();
    let log_session_id = session_id.clone();
    let log_store_name = store_name.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        request_load_script(&sender, session_id, final_code, store_name)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match &result {
        Ok(script_id) => emit_devtools_frida_log(
            &app,
            "info",
            format!(
                "load_script succeeded session={} script={} store={}",
                log_session_id,
                script_id,
                log_store_name.as_deref().unwrap_or("-")
            ),
        ),
        Err(err) => emit_devtools_frida_log(
            &app,
            "error",
            format!(
                "load_script failed session={} store={} error={}",
                log_session_id,
                log_store_name.as_deref().unwrap_or("-"),
                err
            ),
        ),
    }

    result
}

/// Load a script from a file path
#[tauri::command]
pub async fn frida_load_script_file(
    app: AppHandle,
    frida: State<'_, FridaManager>,
    store_manager: State<'_, StoreManager>,
    session_id: String,
    path: String,
    store_name: Option<String>,
) -> Result<String, String> {
    let code = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read script file {}: {}", path, e))?;

    // Build final code with preamble if store_name is provided
    let final_code = if let Some(ref name) = store_name {
        let initial_state = store_manager
            .get(name)
            .map(|s| serde_json::to_string(&s).unwrap_or_default())
            .unwrap_or_else(|| "{}".to_string());
        let preamble_code = preamble::generate(name, &initial_state);
        format!("{}\n\n{}", preamble_code, code)
    } else {
        code
    };

    let sender = frida.inner().clone_sender();
    let log_session_id = session_id.clone();
    let log_store_name = store_name.clone();
    let log_path = path.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        request_load_script(&sender, session_id, final_code, store_name)
    })
    .await
    .map_err(|e| format!("Task join error: {}", e))?;

    match &result {
        Ok(script_id) => emit_devtools_frida_log(
            &app,
            "info",
            format!(
                "load_script_file succeeded session={} script={} file={} store={}",
                log_session_id,
                script_id,
                log_path,
                log_store_name.as_deref().unwrap_or("-")
            ),
        ),
        Err(err) => emit_devtools_frida_log(
            &app,
            "error",
            format!(
                "load_script_file failed session={} file={} store={} error={}",
                log_session_id,
                log_path,
                log_store_name.as_deref().unwrap_or("-"),
                err
            ),
        ),
    }

    result
}

/// Unload a script
#[tauri::command]
pub async fn frida_unload_script(
    frida: State<'_, FridaManager>,
    script_id: String,
) -> Result<(), String> {
    let sender = frida.inner().clone_sender();
    tauri::async_runtime::spawn_blocking(move || request_unload_script(&sender, script_id))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Detach a session
#[tauri::command]
pub async fn frida_detach(
    app: AppHandle,
    frida: State<'_, FridaManager>,
    session_id: String,
) -> Result<(), String> {
    let sender = frida.inner().clone_sender();
    let detached_session_id = session_id.clone();
    let result = tauri::async_runtime::spawn_blocking(move || request_detach(&sender, session_id))
        .await
        .map_err(|e| format!("Task join error: {}", e))?;

    if result.is_ok() {
        let _ = app.emit(
            "frida:session-detached",
            &serde_json::json!({ "sessionId": detached_session_id }),
        );
    }
    result
}

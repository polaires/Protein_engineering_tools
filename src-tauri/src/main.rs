// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path_resolver()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir)
                .expect("Failed to create app data directory");

            // Database path
            let db_path = app_data_dir.join("users.db");

            // Initialize database state
            let db_state = auth::DbState::new(db_path)
                .expect("Failed to initialize database");

            app.manage(db_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            auth::register_user,
            auth::login_user,
            auth::logout_user,
            auth::get_current_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

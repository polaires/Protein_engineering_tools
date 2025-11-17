use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub email: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub message: String,
    pub user: Option<User>,
}

// ============================================================================
// Database State
// ============================================================================

pub struct DbState {
    pub conn: Mutex<Connection>,
    pub current_user: Mutex<Option<User>>,
}

impl DbState {
    pub fn new(db_path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;

        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_recipes (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT NOT NULL,
                components TEXT NOT NULL,
                total_volume REAL NOT NULL,
                volume_unit TEXT NOT NULL,
                ph REAL,
                instructions TEXT,
                notes TEXT,
                tags TEXT,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_measurements (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                protein_name TEXT NOT NULL,
                date TEXT NOT NULL,
                absorbance_280 REAL NOT NULL,
                extinction_coefficient REAL NOT NULL,
                molecular_weight REAL NOT NULL,
                path_length REAL NOT NULL,
                concentration REAL NOT NULL,
                concentration_molar REAL NOT NULL,
                notes TEXT,
                sequence TEXT,
                batch_number TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY,
                default_volume REAL NOT NULL DEFAULT 100,
                default_volume_unit TEXT NOT NULL DEFAULT 'mL',
                default_concentration_unit TEXT NOT NULL DEFAULT 'M',
                recent_chemicals TEXT,
                favorite_recipes TEXT,
                theme TEXT NOT NULL DEFAULT 'auto',
                scientific_notation INTEGER NOT NULL DEFAULT 0,
                decimal_places INTEGER NOT NULL DEFAULT 4,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            [],
        )?;

        Ok(Self {
            conn: Mutex::new(conn),
            current_user: Mutex::new(None),
        })
    }
}

// ============================================================================
// Tauri Commands
// ============================================================================

#[tauri::command]
pub fn register_user(
    request: RegisterRequest,
    db_state: State<'_, DbState>,
) -> Result<AuthResponse, String> {
    // Validate input
    if request.username.is_empty() || request.password.is_empty() || request.email.is_empty() {
        return Ok(AuthResponse {
            success: false,
            message: "Username, email, and password are required".to_string(),
            user: None,
        });
    }

    if request.password.len() < 6 {
        return Ok(AuthResponse {
            success: false,
            message: "Password must be at least 6 characters".to_string(),
            user: None,
        });
    }

    // Hash password
    let password_hash = bcrypt::hash(&request.password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    let conn = db_state.conn.lock().unwrap();

    // Check if username or email already exists
    let exists: Result<i64, _> = conn.query_row(
        "SELECT id FROM users WHERE username = ? OR email = ?",
        params![&request.username, &request.email],
        |row| row.get(0),
    );

    if exists.is_ok() {
        return Ok(AuthResponse {
            success: false,
            message: "Username or email already exists".to_string(),
            user: None,
        });
    }

    // Insert new user
    conn.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        params![&request.username, &request.email, &password_hash],
    )
    .map_err(|e| format!("Failed to create user: {}", e))?;

    let user_id = conn.last_insert_rowid();

    // Create default preferences
    conn.execute(
        "INSERT INTO user_preferences (user_id) VALUES (?)",
        params![user_id],
    )
    .map_err(|e| format!("Failed to create user preferences: {}", e))?;

    // Get created user
    let user = conn
        .query_row(
            "SELECT id, username, email, created_at FROM users WHERE id = ?",
            params![user_id],
            |row| {
                Ok(User {
                    id: row.get(0)?,
                    username: row.get(1)?,
                    email: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        )
        .map_err(|e| format!("Failed to fetch user: {}", e))?;

    // Set current user
    *db_state.current_user.lock().unwrap() = Some(user.clone());

    Ok(AuthResponse {
        success: true,
        message: "Registration successful".to_string(),
        user: Some(user),
    })
}

#[tauri::command]
pub fn login_user(
    request: LoginRequest,
    db_state: State<'_, DbState>,
) -> Result<AuthResponse, String> {
    // Validate input
    if request.username.is_empty() || request.password.is_empty() {
        return Ok(AuthResponse {
            success: false,
            message: "Username and password are required".to_string(),
            user: None,
        });
    }

    let conn = db_state.conn.lock().unwrap();

    // Get user from database
    let user_result: Result<(i64, String, String, String, String), _> = conn.query_row(
        "SELECT id, username, email, password_hash, created_at FROM users WHERE username = ?",
        params![&request.username],
        |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        },
    );

    match user_result {
        Ok((id, username, email, password_hash, created_at)) => {
            // Verify password
            let password_valid = bcrypt::verify(&request.password, &password_hash)
                .map_err(|e| format!("Password verification error: {}", e))?;

            if !password_valid {
                return Ok(AuthResponse {
                    success: false,
                    message: "Invalid username or password".to_string(),
                    user: None,
                });
            }

            let user = User {
                id,
                username,
                email,
                created_at,
            };

            // Set current user
            *db_state.current_user.lock().unwrap() = Some(user.clone());

            Ok(AuthResponse {
                success: true,
                message: "Login successful".to_string(),
                user: Some(user),
            })
        }
        Err(_) => Ok(AuthResponse {
            success: false,
            message: "Invalid username or password".to_string(),
            user: None,
        }),
    }
}

#[tauri::command]
pub fn logout_user(db_state: State<'_, DbState>) -> Result<AuthResponse, String> {
    *db_state.current_user.lock().unwrap() = None;

    Ok(AuthResponse {
        success: true,
        message: "Logged out successfully".to_string(),
        user: None,
    })
}

#[tauri::command]
pub fn get_current_user(db_state: State<'_, DbState>) -> Result<Option<User>, String> {
    let current_user = db_state.current_user.lock().unwrap().clone();
    Ok(current_user)
}

use axum::{
    Router,
    http::{Method, header::CONTENT_TYPE},
    middleware,
    routing::{get, post},
};
use std::{env, fs, net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;

mod process;
mod structures;

use crate::process::{auth_middleware, get_todos, login, post_todos};
use crate::structures::{AdminUser, AppState};

#[tokio::main]
async fn main() {
    let users_file_path = env::var("USERS_FILE_PATH").unwrap_or("users.json".to_owned());
    let admins: Vec<AdminUser> = match fs::read_to_string(&users_file_path) {
        Ok(data_str) => match serde_json::from_str(&data_str) {
            Ok(users) => users,
            Err(e) => {
                eprintln!("Fatal: Failed to parse JSON from '{}': {}", users_file_path, e);
                std::process::exit(1);
            }
        },
        Err(e) => {
            eprintln!("Fatal: Failed to read file '{}': {}", users_file_path, e);
            std::process::exit(1);
        }
    };
    let jwt_secret = env::var("JWT_SECRET").unwrap_or("mysecretkey".to_string());
    let state = Arc::new(AppState { admins, jwt_secret });
    let cors_layer = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(vec![Method::GET, Method::POST])
        .allow_headers(vec![CONTENT_TYPE, "Authorization".parse().unwrap()]);
    let app: Router<()> = Router::new()
        .route("/todos", get(get_todos))
        .route("/todos", post(post_todos).layer(middleware::from_fn_with_state(state.clone(), auth_middleware)))
        .route("/login", post(login))
        .with_state(state)
        .layer(cors_layer);
    let addr: SocketAddr = env::var("LISTEN_ADDRESS").unwrap_or("127.0.0.1:3072".to_owned()).parse().expect("Invalid LISTEN_ADDRESS format");
    println!("Backend server listening on http://{}", addr);
    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("Fatal: Server error: {}", e)
            }
        }
        Err(e) => {
            eprintln!("Fatal: Failed to bind to address {}: {}", addr, e);
        }
    }
}

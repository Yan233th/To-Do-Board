use axum::{
    Json, Router,
    http::{Method, header::CONTENT_TYPE},
    routing::get,
};
use serde_json::{Value, json};
use std::{env, fs, net::SocketAddr};
use tower_http::cors::CorsLayer;

// const TODOS_FILE_PATH: &str = "todos.json";

async fn get_todos() -> Json<Value> {
    let todos_file_path = env::var("TODOS_FILE_PATH").unwrap_or("todos.json".to_owned());
    match fs::read_to_string(&todos_file_path) {
        Ok(data_str) => match serde_json::from_str(&data_str) {
            Ok(json_value) => Json(json_value),
            Err(parse_error) => {
                eprintln!("Error: Failed to parse JSON from '{}': {}. Returning empty list.", &todos_file_path, parse_error);
                Json(json!([]))
            }
        },
        Err(file_err) => {
            eprintln!("Error: Failed to read file '{}': {}. Returning empty list.", &todos_file_path, file_err);
            Json(json!([]))
        }
    }
}

#[tokio::main]
async fn main() {
    let cors_layer = CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods(vec![Method::GET])
        .allow_headers(vec![CONTENT_TYPE]);
    let app: Router<()> = Router::new().route("/todos", get(get_todos)).layer(cors_layer);
    // let addr: SocketAddr = "127.0.0.1:3072".parse().unwrap();
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

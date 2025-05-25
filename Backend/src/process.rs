use crate::structures::{AppState, Claims, LoginRequest, Todo, TodoRequest};
use axum::{Json, extract::State, http::StatusCode};
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde_json::{Value, json};
use std::{env, fs, sync::Arc};

pub async fn get_todos() -> Json<Value> {
    let todos_file_path = env::var("TODOS_FILE_PATH").unwrap_or("todos.json".to_owned());
    return match fs::read_to_string(&todos_file_path) {
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
    };
}

pub async fn login(State(state): State<Arc<AppState>>, Json(login): Json<LoginRequest>) -> Result<Json<Value>, StatusCode> {
    let user = state.admins.iter().find(|admin| admin.username == login.username && admin.password == login.password);
    return match user {
        Some(admin) => {
            let expiration = Utc::now() + Duration::hours(24);
            let claims = Claims {
                sub: admin.username.clone(),
                exp: expiration.timestamp(),
            };
            let token = encode(&Header::default(), &claims, &EncodingKey::from_secret(state.jwt_secret.as_ref())).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            Ok(Json(json!({"token": token})))
        }
        None => Err(StatusCode::UNAUTHORIZED),
    };
}

pub async fn auth_middleware(State(state): State<Arc<AppState>>, request: axum::http::Request<axum::body::Body>, next: axum::middleware::Next) -> Result<axum::response::Response, StatusCode> {
    let auth_header = request
        .headers()
        .get("Authorization")
        .and_then(|header| header.to_str().ok())
        .and_then(|header| header.strip_prefix("Bearer "));
    let token = auth_header.ok_or(StatusCode::UNAUTHORIZED)?;
    let claims = decode::<Claims>(token, &DecodingKey::from_secret(state.jwt_secret.as_ref()), &Validation::default())
        .map_err(|_| StatusCode::UNAUTHORIZED)?
        .claims;
    return if state.admins.iter().any(|admin| admin.username == claims.sub) {
        Ok(next.run(request).await)
    } else {
        Err(StatusCode::FORBIDDEN)
    };
}

pub async fn post_todos(State(_state): State<Arc<AppState>>, Json(request): Json<TodoRequest>) -> Result<Json<Value>, StatusCode> {
    let todos_file_path = env::var("TODOS_FILE_PATH").unwrap_or("todos.json".to_owned());
    let mut todos: Vec<Todo> = match fs::read_to_string(&todos_file_path) {
        Ok(data_str) => serde_json::from_str(&data_str).unwrap_or_else(|_| vec![]),
        Err(_) => vec![],
    };
    match request.action.as_str() {
        "add" => {
            if let Some(mut todo) = request.todo {
                todo.id = todos.iter().map(|t| t.id).max().unwrap_or(0) + 1;
                todos.push(todo);
            } else {
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        "update" => {
            let id = request.id.ok_or(StatusCode::BAD_REQUEST)?;
            let mut todo = request.todo.ok_or(StatusCode::BAD_REQUEST)?;
            if let Some(index) = todos.iter().position(|t| t.id == id) {
                todo.id = id;
                todos[index] = todo;
            } else {
                return Err(StatusCode::NOT_FOUND);
            }
        }
        "delete" => {
            let id = request.id.ok_or(StatusCode::BAD_REQUEST)?;
            todos.retain(|todo| todo.id != id);
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    }
    let json_str = serde_json::to_string_pretty(&todos).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    fs::write(&todos_file_path, json_str).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    return Ok(Json(json!({"message": "Operation successful"})));
}

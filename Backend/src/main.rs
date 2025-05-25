use axum::{
    Json, Router,
    extract::State,
    http::{Method, StatusCode, header::CONTENT_TYPE},
    middleware,
    routing::{get, post},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{env, fs, net::SocketAddr, sync::Arc};
use tower_http::cors::CorsLayer;

#[derive(Clone, Serialize, Deserialize)]
struct AdminUser {
    username: String,
    password: String,
}

#[derive(Clone)]
struct AppState {
    admins: Vec<AdminUser>,
    jwt_secret: String,
}

#[derive(Serialize, Deserialize)]
struct Claims {
    sub: String, // username
    exp: i64,    // expiration time
}

#[derive(Deserialize)]
struct LoginRequest {
    username: String,
    password: String,
}

#[derive(Serialize, Deserialize)]
struct Todo {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    task: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    completed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    assignee: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    creator: Option<String>,
}

#[derive(Deserialize)]
struct TodoRequest {
    action: String,
    todo: Option<Todo>,
    id: Option<i64>,
}

async fn get_todos() -> Json<Value> {
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

async fn login(State(state): State<Arc<AppState>>, Json(login): Json<LoginRequest>) -> Result<Json<Value>, StatusCode> {
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

async fn auth_middleware(State(state): State<Arc<AppState>>, request: axum::http::Request<axum::body::Body>, next: axum::middleware::Next) -> Result<axum::response::Response, StatusCode> {
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

async fn post_todos(State(_state): State<Arc<AppState>>, Json(request): Json<TodoRequest>) -> Result<Json<Value>, StatusCode> {
    let todos_file_path = env::var("TODOS_FILE_PATH").unwrap_or("todos.json".to_owned());
    let mut todos: Vec<Todo> = match fs::read_to_string(&todos_file_path) {
        Ok(data_str) => serde_json::from_str(&data_str).unwrap_or_else(|_| vec![]),
        Err(_) => vec![],
    };
    match request.action.as_str() {
        "add" => {
            if let Some(mut todo) = request.todo {
                let new_id = todos.iter().map(|t| t.id.unwrap_or(0)).max().unwrap_or(0) + 1;
                todo.id = Some(new_id);
                todos.push(todo);
            } else {
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        "update" => {
            if let Some(id) = request.id {
                if let Some(mut todo) = request.todo {
                    if let Some(index) = todos.iter().position(|t| t.id == Some(id)) {
                        todo.id = Some(id);
                        todos[index] = todo;
                    } else {
                        return Err(StatusCode::NOT_FOUND);
                    }
                } else {
                    return Err(StatusCode::BAD_REQUEST);
                }
            } else {
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        "delete" => {
            if let Some(id) = request.id {
                todos.retain(|todo| todo.id != Some(id));
            } else {
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        _ => return Err(StatusCode::BAD_REQUEST),
    }
    let json_str = serde_json::to_string_pretty(&todos).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    fs::write(&todos_file_path, json_str).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    return Ok(Json(json!({"message": "Operation successful"})));
}

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

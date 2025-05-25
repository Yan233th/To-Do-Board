use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct AdminUser {
    pub username: String,
    pub password: String,
}

#[derive(Clone)]
pub struct AppState {
    pub admins: Vec<AdminUser>,
    pub jwt_secret: String,
}

#[derive(Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // username
    pub exp: i64,    // expiration time
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub task: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completed: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub assignee: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub creator: Option<String>,
}

#[derive(Deserialize)]
pub struct TodoRequest {
    pub action: String,
    pub todo: Option<Todo>,
    pub id: Option<i64>,
}

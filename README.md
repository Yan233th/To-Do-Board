# To-Do-Board

## Backend API

后端使用 JSON 文件 (`todos.json`) 存储任务，管理员操作需 JWT 身份验证。

- **Base URL**: `http://127.0.0.1:3072`
- **Authentication**: `Authorization: Bearer <token>`
- **Environment Variables**:
  - `TODOS_FILE_PATH`: Todos 文件路径 (默认: `todos.json`)
  - `USERS_FILE_PATH`: Users 文件路径 (默认: `users.json`)
  - `JWT_SECRET`: JWT 密钥 (默认: `mysecretkey`)
  - `LISTEN_ADDRESS`: 服务器监听地址 (默认: `127.0.0.1:3072`)

### Data Models

#### Task Object

| 字段        | 类型    | 描述               | 说明               |
| ----------- | ------- | ------------------ | ------------------ |
| `id`        | integer | 任务的唯一标识符。 | 由服务器自动生成。 |
| `task`      | string  | 任务的描述。       | 可选。             |
| `completed` | boolean | 任务的完成状态。   | 可选。             |
| `assignee`  | string  | 任务分配给的用户。 | 可选。             |
| `creator`   | string  | 创建任务的用户。   | 可选。             |

**任务对象示例:**

```json
{
  "id": 1,
  "task": "遛狗",
  "completed": true,
  "assignee": "张三",
  "creator": "李四"
}
```

## API Endpoints

### 1. Login

- **Method**: `POST`
- **Endpoint**: `/login`
- **Description**: 管理员登录获取 JWT 令牌。
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response**:
  - `200 OK`: `{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}`
  - `401 Unauthorized`: 用户名或密码无效。
- **Example**:
  ```bash
  curl -X POST http://127.0.0.1:3072/login -H "Content-Type: application/json" -d '{"username":"admin1","password":"password123"}'
  ```

### 2. Get Todos

- **Method**: `GET`
- **Endpoint**: `/todos`
- **Description**: 获取所有待办任务。
- **Response**:
  - `200 OK`: 任务列表 `[{"id": 1, "task": "新任务", "completed": false, ...}]`
  - `500 Internal Server Error`: 服务器错误。
- **Example**:
  ```bash
  curl -X GET http://127.0.0.1:3072/todos
  ```

### 3. Manage Todos

- **Method**: `POST`
- **Endpoint**: `/todos`
- **Description**: 添加、更新或删除任务 (仅限管理员)。
- **Request Body**:
  ```json
  {
    "action": "string", // 必需: "add", "update", 或 "delete"
    "id": "integer", // "update" 和 "delete" 时必需，任务ID
    "todo": {
      // "add" 和 "update" 时必需
      "task": "string", // 可选
      "completed": "boolean", // 可选
      "assignee": "string", // 可选
      "creator": "string" // 可选
      // 注意: "add" 操作时，`todo` 对象内不应包含 `id`
    }
  }
  ```
  - `action: "add"`: 提供 `todo` 对象。
  - `action: "update"`: 提供顶层 `id` 和 `todo` 对象（包含要修改的字段）。
  - `action: "delete"`: 提供顶层 `id`。
- **Response**:
  - `200 OK`: `{"message": "Operation successful"}`
  - `400 Bad Request`: 请求无效。
  - `401 Unauthorized`: 令牌无效。
  - `403 Forbidden`: 非管理员。
  - `404 Not Found`: 任务未找到。
- **Examples**:
  - 添加:
    ```bash
    curl -X POST http://127.0.0.1:3072/todos -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"action":"add","todo":{"task":"新任务"}}'
    ```
  - 更新:
    ```bash
    curl -X POST http://127.0.0.1:3072/todos -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"action":"update","id":1,"todo":{"task":"更新任务"}}'
    ```
  - 删除:
    ```bash
    curl -X POST http://127.0.0.1:3072/todos -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"action":"delete","id":1}'
    ```

## Notes

- 任务 `id` 在添加时自动生成和自增。
- JWT 令牌 24 小时后过期。
- `users.json` 格式: `[{"username": "admin1", "password": "password123"}]`

## Development

- **Language**: Rust
- **Framework**: Axum

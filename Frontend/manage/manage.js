// API and LocalStorage Constants
const API_BASE_URL = 'http://127.0.0.1:3072';
const TODOS_ENDPOINT = `${API_BASE_URL}/todos`;
const LS_KEY_JWT_TOKEN = 'jwtToken';

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const todoListContainer = document.getElementById('todoListContainer');
const noTodosMessage = document.getElementById('noTodosMessage');
const addTodoForm = document.getElementById('addTodoForm');
const logoutButton = document.getElementById('logoutButton');

// Edit Modal Elements
const editTodoModal = document.getElementById('editTodoModal');
const closeEditModalButton = document.getElementById('closeEditModalButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const editTodoForm = document.getElementById('editTodoForm');
const editTodoIdInput = document.getElementById('editTodoId');
const editTaskInput = document.getElementById('editTask');
const editAssigneeInput = document.getElementById('editAssignee');
const editCreatorInput = document.getElementById('editCreator');
const editCompletedCheckbox = document.getElementById('editCompleted');

// --- Utility Functions ---
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
        todoListContainer.classList.add('hidden');
        noTodosMessage.classList.add('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
        todoListContainer.classList.remove('hidden');
    }
}

function showAlert(message, type = 'error') {
    alert(`${type === 'error' ? '错误' : '信息'}: ${message}`);
}

function getToken() {
    return localStorage.getItem(LS_KEY_JWT_TOKEN);
}

function redirectToLogin() {
    localStorage.removeItem(LS_KEY_JWT_TOKEN);
    window.location.href = '../login/login.html';
}

// --- Modal Management ---
function openEditModal(todo) {
    editTodoIdInput.value = todo.id;
    editTaskInput.value = todo.task || '';
    editAssigneeInput.value = todo.assignee || '';
    editCreatorInput.value = todo.creator || '';
    editCompletedCheckbox.checked = todo.completed || false;

    editTodoModal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95');
    editTodoModal.classList.add('opacity-100', 'scale-100');
    document.body.classList.add('modal-active');
}

function closeEditModal() {
    editTodoModal.classList.add('opacity-0', 'pointer-events-none', 'scale-95');
    editTodoModal.classList.remove('opacity-100', 'scale-100');
    document.body.classList.remove('modal-active');
    editTodoForm.reset();
}

// --- API Call Functions ---
async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        showAlert('未找到认证令牌。请重新登录。');
        redirectToLogin();
        throw new Error('No token found');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        showAlert('会话已过期或无权限。请重新登录。');
        redirectToLogin();
        throw new Error('Unauthorized or Forbidden');
    }
    return response;
}

async function fetchTodos() {
    showLoading(true);
    try {
        const response = await fetchWithAuth(TODOS_ENDPOINT);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '获取任务列表失败，请稍后重试。' }));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        const todos = await response.json();
        renderTodos(todos);
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') {
            showLoading(false);
            await new Promise(resolve => setTimeout(resolve, 0));
            showAlert(`获取任务失败: ${error.message}`);
        }
        renderTodos([]);
    } finally {
        showLoading(false);
    }
}

async function addTodo(todoData) {
    try {
        const payload = {
            action: 'add',
            todo: {
                task: todoData.task,
                assignee: todoData.assignee || null,
                creator: todoData.creator || null,
                completed: false,
            },
        };
        const response = await fetchWithAuth(TODOS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '添加任务失败，请检查输入或稍后重试。' }));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        showAlert('任务添加成功!', 'success');
        await fetchTodos();
        addTodoForm.reset();
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') {
            showAlert(`添加任务失败: ${error.message}`);
        }
    }
}

async function updateTodo(id, updatedTodoData) {
    try {
        const payload = {
            action: 'update',
            id: parseInt(id, 10),
            todo: updatedTodoData,
        };
        const response = await fetchWithAuth(TODOS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '更新任务失败，请稍后重试。' }));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        showAlert('任务更新成功!', 'success');
        closeEditModal();
        await fetchTodos();
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') {
            showAlert(`更新任务失败: ${error.message}`);
        }
    }
}

async function deleteTodo(id) {
    if (!confirm('确定要删除这个任务吗？此操作无法撤销。')) {
        return;
    }
    try {
        const payload = {
            action: 'delete',
            id: parseInt(id, 10),
        };
        const response = await fetchWithAuth(TODOS_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '删除任务失败，请稍后重试。' }));
            throw new Error(errorData.message || `HTTP error ${response.status}`);
        }
        showAlert('任务删除成功!', 'success');
        await fetchTodos();
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') {
            showAlert(`删除任务失败: ${error.message}`);
        }
    }
}

// --- Rendering Functions ---
function renderTodos(todos) {
    todoListContainer.innerHTML = '';

    if (!todos || todos.length === 0) {
        noTodosMessage.classList.remove('hidden');
        todoListContainer.classList.add('hidden');
        return;
    }

    noTodosMessage.classList.add('hidden');
    todoListContainer.classList.remove('hidden');

    todos.forEach(todo => {
        const card = document.createElement('div');
        card.className = `bg-white p-5 rounded-lg shadow-md flex flex-col border-l-4 ${todo.completed ? 'border-green-500' : 'border-yellow-500'}`;

        // Container for task details (title, assignee, creator, ID)
        const taskDetailsContainer = document.createElement('div');
        // 修改下面这行：
        taskDetailsContainer.className = 'flex-grow'; // <--- 添加 'flex-grow' 类

        let taskInfoHTML = `<h3 class="text-xl font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}">${todo.task || '未命名任务'}</h3>`;
        if (todo.assignee) {
            taskInfoHTML += `<p class="text-sm text-gray-600">负责人: ${todo.assignee}</p>`;
        }
        if (todo.creator) {
            taskInfoHTML += `<p class="text-sm text-gray-600">创建人: ${todo.creator}</p>`;
        }
        taskInfoHTML += `<p class="text-xs text-gray-400 mt-1">ID: ${todo.id}</p>`;
        taskDetailsContainer.innerHTML = taskInfoHTML;

        // Container for status and buttons
        const bottomContainer = document.createElement('div');
        // bottomContainer 的 className 保持不变，mt-4 和 pt-4 用于内边距和边框，space-y-3 用于状态和按钮之间的间距
        bottomContainer.className = 'mt-4 pt-4 border-t border-gray-200 space-y-3';

        const statusBadgeHTML = `<div class="self-start"><span class="px-3 py-1 text-xs font-semibold rounded-full ${todo.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${todo.completed ? '已完成' : '待处理'}</span></div>`;

        const buttonsHTML = `
        <div class="flex flex-wrap gap-2">
            <button data-action="edit" data-id="${todo.id}" class="flex-1 bg-blue-500 text-white px-3 py-2 text-sm rounded-md hover:bg-blue-600 transition-colors">编辑</button>
            <button data-action="delete" data-id="${todo.id}" class="flex-1 bg-red-500 text-white px-3 py-2 text-sm rounded-md hover:bg-red-600 transition-colors">删除</button>
        </div>
    `;
        bottomContainer.innerHTML = statusBadgeHTML + buttonsHTML;

        card.appendChild(taskDetailsContainer);
        card.appendChild(bottomContainer);

        todoListContainer.appendChild(card);

        card.querySelector('button[data-action="edit"]').addEventListener('click', () => openEditModal(todo));
        card.querySelector('button[data-action="delete"]').addEventListener('click', () => deleteTodo(todo.id));
    });
}


// --- Event Listeners ---
addTodoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const task = addTodoForm.elements.task.value.trim();
    const assignee = addTodoForm.elements.assignee.value.trim();
    const creator = addTodoForm.elements.creator.value.trim();

    if (!task) {
        showAlert('任务描述不能为空。');
        return;
    }
    addTodo({ task, assignee, creator });
});

logoutButton.addEventListener('click', () => {
    if (confirm('确定要登出吗?')) {
        redirectToLogin();
    }
});

closeEditModalButton.addEventListener('click', closeEditModal);
cancelEditButton.addEventListener('click', closeEditModal);

editTodoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = editTodoIdInput.value;
    const updatedTodoData = {
        id: parseInt(id, 10),
        task: editTaskInput.value.trim(),
        assignee: editAssigneeInput.value.trim() || null,
        creator: editCreatorInput.value.trim() || null,
        completed: editCompletedCheckbox.checked,
    };
    if (!updatedTodoData.task) {
        showAlert('任务描述不能为空。');
        return;
    }
    updateTodo(id, updatedTodoData);
});

// --- Initial Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    if (!getToken()) {
        redirectToLogin();
    } else {
        fetchTodos();
    }
});

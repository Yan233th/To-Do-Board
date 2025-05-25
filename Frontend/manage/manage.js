// API and LocalStorage Constants
const API_BASE_URL = 'http://127.0.0.1:3072'; //
const TODOS_ENDPOINT = `${API_BASE_URL}/todos`; //
const LS_KEY_JWT_TOKEN = 'jwtToken'; //

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator'); //
const todoListContainer = document.getElementById('todoListContainer'); //
const noTodosMessage = document.getElementById('noTodosMessage'); //
const addTodoForm = document.getElementById('addTodoForm'); //
const logoutButton = document.getElementById('logoutButton'); //
const notificationArea = document.getElementById('notificationArea'); // For new notification system

// Edit Modal Elements
const editTodoModal = document.getElementById('editTodoModal'); //
const closeEditModalButton = document.getElementById('closeEditModalButton'); //
const cancelEditButton = document.getElementById('cancelEditButton'); //
const editTodoForm = document.getElementById('editTodoForm'); //
const editTodoIdInput = document.getElementById('editTodoId'); //
const editTaskInput = document.getElementById('editTask'); //
const editAssigneeInput = document.getElementById('editAssignee'); //
const editCreatorInput = document.getElementById('editCreator'); //
const editCompletedCheckbox = document.getElementById('editCompleted'); //

// --- Utility Functions ---
function showLoading(show) { //
    if (loadingIndicator && todoListContainer && noTodosMessage) {
        if (show) {
            loadingIndicator.classList.remove('hidden'); //
            todoListContainer.classList.add('hidden'); //
            noTodosMessage.classList.add('hidden'); //
        } else {
            loadingIndicator.classList.add('hidden'); //
            todoListContainer.classList.remove('hidden'); //
        }
    }
}

function showNotification(message, type = 'error', duration = 4000) {
    if (!notificationArea) {
        // Fallback to alert if notification area isn't found (should not happen with new HTML)
        alert(`${type === 'error' ? '错误' : '信息'}: ${message}`);
        return;
    }

    const notificationId = `notification-${Date.now()}`;
    const notification = document.createElement('div');
    notification.id = notificationId;

    let bgColorClass = 'bg-red-600'; // Default error
    if (type === 'success') {
        bgColorClass = 'bg-green-600';
    } else if (type === 'info') {
        bgColorClass = 'bg-blue-600';
    }

    notification.className = `p-4 mb-3 rounded-md text-white shadow-lg text-sm ${bgColorClass} flex justify-between items-center transition-opacity duration-300 ease-out`;
    notification.style.opacity = '0'; // Start transparent for fade-in

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'ml-3 -mr-1 px-1 text-xl leading-none font-semibold hover:text-gray-300 focus:outline-none';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.onclick = () => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300); // Remove after fade out
    };
    notification.appendChild(closeButton);

    notificationArea.appendChild(notification);

    // Trigger fade-in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
    });

    if (duration > 0) {
        setTimeout(() => {
            // Trigger fade-out then remove
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300); // Remove after fade out
        }, duration);
    }
}


function getToken() { //
    return localStorage.getItem(LS_KEY_JWT_TOKEN); //
}

function redirectToLogin() { //
    localStorage.removeItem(LS_KEY_JWT_TOKEN); //
    window.location.href = '../login/login.html'; //
}

// --- Modal Management ---
function openEditModal(todo) { //
    editTodoIdInput.value = todo.id; //
    editTaskInput.value = todo.task || ''; //
    editAssigneeInput.value = todo.assignee || ''; //
    editCreatorInput.value = todo.creator || ''; //
    editCompletedCheckbox.checked = todo.completed || false; //

    editTodoModal.classList.remove('opacity-0', 'pointer-events-none', 'scale-95'); //
    editTodoModal.classList.add('opacity-100', 'scale-100'); //
    document.body.classList.add('modal-active'); //
}

function closeEditModal() { //
    editTodoModal.classList.add('opacity-0', 'pointer-events-none', 'scale-95'); //
    editTodoModal.classList.remove('opacity-100', 'scale-100'); //
    document.body.classList.remove('modal-active'); //
    editTodoForm.reset(); //
}

// --- API Call Functions ---
async function fetchWithAuth(url, options = {}) { //
    const token = getToken(); //
    if (!token) {
        showNotification('未找到认证令牌。请重新登录。', 'error');
        redirectToLogin(); //
        throw new Error('No token found'); //
    }

    const headers = { //
        'Content-Type': 'application/json', //
        'Authorization': `Bearer ${token}`, //
        ...options.headers, //
    };

    const response = await fetch(url, { ...options, headers }); //

    if (response.status === 401 || response.status === 403) { //
        showNotification('会话已过期或无权限。请重新登录。', 'error');
        redirectToLogin(); //
        throw new Error('Unauthorized or Forbidden'); //
    }
    return response; //
}

async function fetchTodos() { //
    showLoading(true); //
    try {
        const response = await fetchWithAuth(TODOS_ENDPOINT); //
        if (!response.ok) { //
            const errorData = await response.json().catch(() => ({ message: '获取任务列表失败，请稍后重试。' })); //
            throw new Error(errorData.message || `HTTP error ${response.status}`); //
        }
        const todos = await response.json(); //
        renderTodos(todos); //
    } catch (error) {
        // Avoid double notifications if fetchWithAuth already handled auth error and redirected
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') { //
            // Removed: await new Promise(resolve => setTimeout(resolve, 0)); //
            showNotification(`获取任务失败: ${error.message}`, 'error');
        }
        renderTodos([]); // // Clear list or show empty state on error
    } finally {
        showLoading(false); //
    }
}

async function addTodo(todoData) { //
    try {
        const payload = { //
            action: 'add', //
            todo: { //
                task: todoData.task, //
                assignee: todoData.assignee || null, //
                creator: todoData.creator || null, //
                completed: false, //
            },
        };
        const response = await fetchWithAuth(TODOS_ENDPOINT, { //
            method: 'POST', //
            body: JSON.stringify(payload), //
        });

        if (!response.ok) { //
            const errorData = await response.json().catch(() => ({ message: '添加任务失败，请检查输入或稍后重试。' })); //
            throw new Error(errorData.message || `HTTP error ${response.status}`); //
        }
        showNotification('任务添加成功!', 'success');
        await fetchTodos(); //
        addTodoForm.reset(); //
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') { //
            showNotification(`添加任务失败: ${error.message}`, 'error');
        }
    }
}

async function updateTodo(id, updatedTodoData) { //
    try {
        // The API expects the full todo object under the "todo" key for updates,
        // not just the ID inside it. The ID is top-level.
        const payload = { //
            action: 'update', //
            id: parseInt(id, 10), //
            todo: { //
                task: updatedTodoData.task,
                assignee: updatedTodoData.assignee,
                creator: updatedTodoData.creator,
                completed: updatedTodoData.completed
            },
        };
        const response = await fetchWithAuth(TODOS_ENDPOINT, { //
            method: 'POST', //
            body: JSON.stringify(payload), //
        });

        if (!response.ok) { //
            const errorData = await response.json().catch(() => ({ message: '更新任务失败，请稍后重试。' })); //
            throw new Error(errorData.message || `HTTP error ${response.status}`); //
        }
        showNotification('任务更新成功!', 'success');
        closeEditModal(); //
        await fetchTodos(); //
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') { //
            showNotification(`更新任务失败: ${error.message}`, 'error');
        }
    }
}

async function deleteTodo(id) { //
    // Use new notification system for confirmation if possible, or stick to confirm
    if (!confirm('确定要删除这个任务吗？此操作无法撤销。')) { //
        return;
    }
    try {
        const payload = { //
            action: 'delete', //
            id: parseInt(id, 10), //
        };
        const response = await fetchWithAuth(TODOS_ENDPOINT, { //
            method: 'POST', //
            body: JSON.stringify(payload), //
        });

        if (!response.ok) { //
            const errorData = await response.json().catch(() => ({ message: '删除任务失败，请稍后重试。' })); //
            throw new Error(errorData.message || `HTTP error ${response.status}`); //
        }
        showNotification('任务删除成功!', 'success');
        await fetchTodos(); //
    } catch (error) {
        if (error.message !== 'No token found' && error.message !== 'Unauthorized or Forbidden') { //
            showNotification(`删除任务失败: ${error.message}`, 'error');
        }
    }
}

// --- Rendering Functions ---
function createTodoCardElement(todo) {
    const card = document.createElement('div');
    card.className = `bg-white p-5 rounded-lg shadow-md flex flex-col border-l-4 ${todo.completed ? 'border-green-500' : 'border-yellow-500'}`; //

    const taskDetailsContainer = document.createElement('div');
    taskDetailsContainer.className = 'flex-grow'; //

    const taskTitle = document.createElement('h3');
    taskTitle.className = `text-xl font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`; //
    taskTitle.textContent = todo.task || '未命名任务';
    taskDetailsContainer.appendChild(taskTitle);

    if (todo.assignee) { //
        const assigneeP = document.createElement('p');
        assigneeP.className = 'text-sm text-gray-600'; //
        assigneeP.textContent = `负责人: ${todo.assignee}`; //
        taskDetailsContainer.appendChild(assigneeP);
    }
    if (todo.creator) { //
        const creatorP = document.createElement('p');
        creatorP.className = 'text-sm text-gray-600'; //
        creatorP.textContent = `创建人: ${todo.creator}`; //
        taskDetailsContainer.appendChild(creatorP);
    }
    const idP = document.createElement('p');
    idP.className = 'text-xs text-gray-400 mt-1'; //
    idP.textContent = `ID: ${todo.id}`; //
    taskDetailsContainer.appendChild(idP);

    const bottomContainer = document.createElement('div');
    bottomContainer.className = 'mt-4 pt-4 border-t border-gray-200 space-y-3'; //

    const statusBadgeDiv = document.createElement('div');
    statusBadgeDiv.className = 'self-start'; //
    const statusSpan = document.createElement('span');
    statusSpan.className = `px-3 py-1 text-xs font-semibold rounded-full ${todo.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`; //
    statusSpan.textContent = todo.completed ? '已完成' : '待处理'; //
    statusBadgeDiv.appendChild(statusSpan);
    bottomContainer.appendChild(statusBadgeDiv);

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'flex flex-wrap gap-2'; //

    const editButton = document.createElement('button');
    editButton.dataset.action = 'edit'; //
    editButton.className = 'flex-1 bg-blue-500 text-white px-3 py-2 text-sm rounded-md hover:bg-blue-600 transition-colors'; //
    editButton.textContent = '编辑';
    editButton.addEventListener('click', () => openEditModal(todo)); //
    buttonsDiv.appendChild(editButton);

    const deleteButton = document.createElement('button');
    deleteButton.dataset.action = 'delete'; //
    deleteButton.className = 'flex-1 bg-red-500 text-white px-3 py-2 text-sm rounded-md hover:bg-red-600 transition-colors'; //
    deleteButton.textContent = '删除';
    deleteButton.addEventListener('click', () => deleteTodo(todo.id)); //
    buttonsDiv.appendChild(deleteButton);

    bottomContainer.appendChild(buttonsDiv);

    card.appendChild(taskDetailsContainer);
    card.appendChild(bottomContainer);

    return card;
}

function renderTodos(todos) { //
    todoListContainer.innerHTML = ''; //

    if (!todos || todos.length === 0) { //
        noTodosMessage.classList.remove('hidden'); //
        todoListContainer.classList.add('hidden'); //
        return; //
    }

    noTodosMessage.classList.add('hidden'); //
    todoListContainer.classList.remove('hidden'); //

    todos.forEach(todo => { //
        const cardElement = createTodoCardElement(todo);
        todoListContainer.appendChild(cardElement);
    });
}


// --- Event Listeners ---
if (addTodoForm) {
    addTodoForm.addEventListener('submit', (e) => { //
        e.preventDefault(); //
        const task = addTodoForm.elements.task.value.trim(); //
        const assignee = addTodoForm.elements.assignee.value.trim(); //
        const creator = addTodoForm.elements.creator.value.trim(); //

        if (!task) { //
            showNotification('任务描述不能为空。', 'error');
            return; //
        }
        addTodo({ task, assignee, creator }); //
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', () => { //
        if (confirm('确定要登出吗?')) { //
            redirectToLogin(); //
        }
    });
}

if (closeEditModalButton) {
    closeEditModalButton.addEventListener('click', closeEditModal); //
}
if (cancelEditButton) {
    cancelEditButton.addEventListener('click', closeEditModal); //
}

if (editTodoForm) {
    editTodoForm.addEventListener('submit', (e) => { //
        e.preventDefault(); //
        const id = editTodoIdInput.value; //
        const taskValue = editTaskInput.value.trim(); //

        if (!taskValue) { //
            showNotification('任务描述不能为空。', 'error');
            return; //
        }

        const updatedTodoData = { //
            // id: parseInt(id, 10), // ID is passed as a separate parameter to updateTodo now
            task: taskValue, //
            assignee: editAssigneeInput.value.trim() || null, //
            creator: editCreatorInput.value.trim() || null, //
            completed: editCompletedCheckbox.checked, //
        };
        updateTodo(id, updatedTodoData); //
    });
}

// --- Initial Page Load ---
document.addEventListener('DOMContentLoaded', () => { //
    if (!getToken()) { //
        redirectToLogin(); //
    } else {
        fetchTodos(); //
    }
});
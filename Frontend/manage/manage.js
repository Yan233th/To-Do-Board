function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('todo-list').classList.toggle('hidden', show);
    document.getElementById('error').classList.add('hidden');
}

function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('todo-list').classList.add('hidden');
}

function renderTodos(todos) {
    const todoList = document.getElementById('todo-list');
    todoList.innerHTML = '';

    todos.forEach(todo => {
        const todoCard = document.createElement('div');
        todoCard.className = 'todo-card bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col space-y-2';

        const taskInfo = document.createElement('div');
        taskInfo.innerHTML = `
            <h3 class="text-lg font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}">
                ${todo.task}
            </h3>
            <p class="text-sm text-gray-600">Assigned to: ${todo.assignee}</p>
            <p class="text-sm text-gray-600">Created by: ${todo.creator}</p>
        `;

        const status = document.createElement('span');
        status.className = `px-3 py-1 rounded-full text-sm font-medium ${todo.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`;
        status.textContent = todo.completed ? 'Completed' : 'Pending';

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'flex space-x-2';
        const toggleButton = document.createElement('button');
        toggleButton.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition';
        toggleButton.textContent = todo.completed ? 'Mark Pending' : 'Mark Completed';
        toggleButton.onclick = () => updateTodo(todo.id, { completed: !todo.completed });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteTodo(todo.id);

        buttonGroup.appendChild(toggleButton);
        buttonGroup.appendChild(deleteButton);
        todoCard.appendChild(taskInfo);
        todoCard.appendChild(status);
        todoCard.appendChild(buttonGroup);
        todoList.appendChild(todoCard);
    });
}

async function fetchTodos() {
    toggleLoading(true);
    try {
        const token = localStorage.getItem('jwtToken');
        if (!token) throw new Error('No token found, please login');

        const response = await fetch('https://todo.emptydust.com/todos', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('jwtToken');
            window.location.href = '../login/login.html';
            return;
        }

        if (!response.ok) throw new Error('Failed to fetch TODOs');

        const todos = await response.json();
        renderTodos(todos);
        toggleLoading(false);
    } catch (error) {
        showError(error.message);
    }
}

async function addTodo(todo) {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await fetch('https://todo.emptydust.com/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'add', todo })
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('jwtToken');
            window.location.href = '../login/login.html';
            return;
        }

        if (!response.ok) throw new Error('Failed to add TODO');

        await fetchTodos();
    } catch (error) {
        showError(error.message);
    }
}

async function updateTodo(id, updates) {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await fetch('https://todo.emptydust.com/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'update', id, todo: updates })
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('jwtToken');
            window.location.href = '../login/login.html';
            return;
        }

        if (!response.ok) throw new Error('Failed to update TODO');

        await fetchTodos();
    } catch (error) {
        showError(error.message);
    }
}

async function deleteTodo(id) {
    try {
        const token = localStorage.getItem('jwtToken');
        const response = await fetch('https://todo.emptydust.com/todos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'delete', id })
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('jwtToken');
            window.location.href = '../login/login.html';
            return;
        }

        if (!response.ok) throw new Error('Failed to delete TODO');

        await fetchTodos();
    } catch (error) {
        showError(error.message);
    }
}

document.getElementById('add-todo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const todo = {
        task: document.getElementById('task').value || undefined,
        assignee: document.getElementById('assignee').value || undefined,
        creator: document.getElementById('creator').value || undefined,
        completed: false
    };
    await addTodo(todo);
    document.getElementById('add-todo-form').reset();
});

document.getElementById('logout').addEventListener('click', () => {
    localStorage.removeItem('jwtToken');
    window.location.href = '../login/login.html';
});

if (!localStorage.getItem('jwtToken')) {
    window.location.href = '../login/login.html';
} else {
    fetchTodos();
}
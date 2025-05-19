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
    todoList.innerHTML = ''; // Clear existing content

    todos.forEach(todo => {
        const todoCard = document.createElement('div');
        todoCard.className = 'todo-card bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center';
        
        const taskInfo = document.createElement('div');
        taskInfo.innerHTML = `
            <h3 class="text-lg font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}">
                ${todo.task}
            </h3>
            <p class="text-sm text-gray-600">Assigned to: ${todo.assignee}</p>
            <p class="text-sm text-gray-600">Created by: ${todo.creator}</p>
        `;
        
        const status = document.createElement('span');
        status.className = `px-3 py-1 rounded-full text-sm font-medium ${
            todo.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`;
        status.textContent = todo.completed ? 'Completed' : 'Pending';
        
        todoCard.appendChild(taskInfo);
        todoCard.appendChild(status);
        todoList.appendChild(todoCard);
    });
}

async function fetchTodos() {
    toggleLoading(true);
    try {
        const response = await fetch('https://todo.emptydust.com/todos');
        if (!response.ok) {
            throw new Error('Failed to fetch TODOs');
        }
        const todos = await response.json();
        renderTodos(todos);
        toggleLoading(false);
    } catch (error) {
        showError('Error fetching TODOs: ' + error.message);
    }
}

// Load TODOs when the page loads
document.addEventListener('DOMContentLoaded', fetchTodos);
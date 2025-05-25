const API_BASE_URL = 'http://127.0.0.1:3072';
const TODOS_ENDPOINT = `${API_BASE_URL}/todos`;

// Cache DOM elements
const loadingDiv = document.getElementById('loading');
const todoListDiv = document.getElementById('todo-list');
const errorDiv = document.getElementById('error');

function toggleLoading(show) {
    loadingDiv.classList.toggle('hidden', !show);
    todoListDiv.classList.toggle('hidden', show);
    errorDiv.classList.add('hidden'); // Hide error when loading state changes
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    loadingDiv.classList.add('hidden');
    todoListDiv.classList.add('hidden');
}

function renderTodos(todos) {
    todoListDiv.innerHTML = ''; // Clear existing content

    if (!todos || todos.length === 0) {
        const noTodosMessage = document.createElement('p');
        noTodosMessage.textContent = 'No tasks found. Add some!';
        noTodosMessage.className = 'text-gray-600 text-center';
        todoListDiv.appendChild(noTodosMessage);
        return;
    }

    todos.forEach(todo => {
        const todoCard = document.createElement('div');
        todoCard.className = 'todo-card bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center';

        const taskInfo = document.createElement('div');

        const taskTitle = document.createElement('h3');
        taskTitle.className = `text-lg font-semibold ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`;
        taskTitle.textContent = todo.task || 'No task description'; // Set text content for security

        const assigneeText = document.createElement('p');
        assigneeText.className = 'text-sm text-gray-600';
        assigneeText.textContent = `Assigned to: ${todo.assignee || 'N/A'}`; // Set text content

        const creatorText = document.createElement('p');
        creatorText.className = 'text-sm text-gray-600';
        creatorText.textContent = `Created by: ${todo.creator || 'N/A'}`; // Set text content

        taskInfo.appendChild(taskTitle);
        taskInfo.appendChild(assigneeText);
        taskInfo.appendChild(creatorText);

        const status = document.createElement('span');
        status.className = `px-3 py-1 rounded-full text-sm font-medium ${todo.completed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`;
        status.textContent = todo.completed ? 'Completed' : 'Pending';

        todoCard.appendChild(taskInfo);
        todoCard.appendChild(status);
        todoListDiv.appendChild(todoCard);
    });
}

async function fetchTodos() {
    toggleLoading(true);
    try {
        const response = await fetch(TODOS_ENDPOINT);
        if (!response.ok) {
            // Try to get a more specific error message from the server if possible
            let errorMsg = `Failed to fetch TODOs. Status: ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    errorMsg += ` - ${errorData.message}`;
                }
            } catch (jsonError) {
                // Ignore if the error response is not JSON
            }
            throw new Error(errorMsg);
        }
        const todos = await response.json();
        renderTodos(todos);
    } catch (error) {
        console.error('Error fetching TODOs:', error); // Log the full error for debugging
        showError(error.message); // Show a user-friendly message
    } finally {
        toggleLoading(false); // Ensure loading is always turned off
    }
}

document.addEventListener('DOMContentLoaded', fetchTodos);
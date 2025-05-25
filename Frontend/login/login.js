function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
    document.getElementById('error').classList.add('hidden');
}

function showError(message) {
    document.getElementById('error').textContent = message;
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    toggleLoading(true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('https://todo.emptydust.com/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error(response.status === 401 ? 'Invalid username or password' : 'Login failed');
        }

        const { token } = await response.json();
        localStorage.setItem('jwtToken', token);
        window.location.href = '../manage/manage.html';
    } catch (error) {
        showError(error.message);
    } finally {
        toggleLoading(false);
    }
});

if (localStorage.getItem('jwtToken')) {
    window.location.href = '../manage/manage.html';
}
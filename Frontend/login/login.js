const API_BASE_URL = 'http://127.0.0.1:3072';
const LOGIN_ENDPOINT = `${API_BASE_URL}/login`;

function toggleLoading(show) {
    document.getElementById('loading').classList.toggle('hidden', !show);
}

function isLockedOut() {
    const lockoutTime = localStorage.getItem('lockoutTime');
    if (!lockoutTime) return false;
    const now = Date.now();
    const lockoutDuration = 5 * 60 * 1000;
    return now < parseInt(lockoutTime) + lockoutDuration;
}

function getRemainingAttempts() {
    return parseInt(localStorage.getItem('loginAttempts') || '0');
}

function incrementFailedAttempts() {
    const attempts = getRemainingAttempts() + 1;
    localStorage.setItem('loginAttempts', attempts.toString());
    if (attempts >= 3) {
        localStorage.setItem('lockoutTime', Date.now().toString());
    }
    return attempts;
}

function resetLoginAttempts() {
    localStorage.removeItem('loginAttempts');
    localStorage.removeItem('lockoutTime');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isLockedOut()) {
        const lockoutTime = localStorage.getItem('lockoutTime');
        const remainingTime = Math.ceil((parseInt(lockoutTime) + 5 * 60 * 1000 - Date.now()) / 1000 / 60);
        alert(`Too many failed attempts. Please try again in ${remainingTime} minute${remainingTime > 1 ? 's' : ''}.`);
        return;
    }

    toggleLoading(true);

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(LOGIN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            localStorage.removeItem('jwtToken');
            const attempts = incrementFailedAttempts();
            if (attempts >= 3) {
                alert('Too many failed attempts. Account locked for 5 minutes.');
            } else {
                const remaining = 3 - attempts;
                let errorMessage;
                if (response.status === 401) {
                    errorMessage = `Invalid username or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
                } else {
                    errorMessage = `Login failed (status: ${response.status}). ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`;
                }
                throw new Error(errorMessage);
            }
            return;
        }

        const { token } = await response.json();
        resetLoginAttempts();
        localStorage.setItem('jwtToken', token);
        window.location.href = '../manage/manage.html';
    } catch (error) {
        alert(error.message);
    } finally {
        toggleLoading(false);
    }
});

if (isLockedOut()) {
    const lockoutTime = localStorage.getItem('lockoutTime');
    const remainingTime = Math.ceil((parseInt(lockoutTime) + 5 * 60 * 1000 - Date.now()) / 1000 / 60);
    alert(`Too many failed attempts. Please try again in ${remainingTime} minute${remainingTime > 1 ? 's' : ''}.`);
} else if (localStorage.getItem('jwtToken')) {
    window.location.href = '../manage/manage.html';
}

const API_BASE_URL = 'https://todo.emptydust.com';
const LOGIN_ENDPOINT = `${API_BASE_URL}/login`;

// Configuration for login attempts
const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Cache DOM Elements
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loadingDiv = document.getElementById('loading');
const errorMessageDiv = document.getElementById('login-error-message');

function toggleLoading(show) {
    loadingDiv.classList.toggle('hidden', !show);
}

function showLoginError(message) {
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.remove('hidden');
    } else {
        alert(message); // Fallback if the error div is not present for some reason
    }
}

function clearLoginError() {
    if (errorMessageDiv) {
        errorMessageDiv.classList.add('hidden');
        errorMessageDiv.textContent = '';
    }
}

function isLockedOut() {
    const lockoutTime = localStorage.getItem('lockoutTime');
    if (!lockoutTime) return false;
    return Date.now() < parseInt(lockoutTime) + LOCKOUT_DURATION_MS;
}

function getFailedAttempts() {
    // Changed: Renamed from getRemainingAttempts for clarity, as it gets current failed attempts.
    return parseInt(localStorage.getItem('loginFailedAttempts') || '0');
}

function incrementFailedAttempts() {
    const attempts = getFailedAttempts() + 1;
    localStorage.setItem('loginFailedAttempts', attempts.toString());
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
        localStorage.setItem('lockoutTime', (Date.now() + LOCKOUT_DURATION_MS).toString()); // Store when lockout ends
    }
    return attempts;
}

function resetLoginAttempts() {
    localStorage.removeItem('loginFailedAttempts');
    localStorage.removeItem('lockoutTime');
}

function handleInitialPageLoad() {
    if (isLockedOut()) {
        const lockoutEndTime = parseInt(localStorage.getItem('lockoutTime'));
        const remainingTimeMs = lockoutEndTime - Date.now();
        const remainingMinutes = Math.ceil(remainingTimeMs / (1000 * 60));
        showLoginError(`Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`);
        if (loginForm) loginForm.querySelector('button[type="submit"]').disabled = true; // Disable form
        return true; // Indicates page interaction should be blocked
    } else if (localStorage.getItem('jwtToken')) {
        // If already logged in, redirect to manage page
        // The API spec indicates JWT expires in 24 hours. A server check upon loading manage.html would be ideal.
        window.location.href = '/manage'; // Assuming manage.html is in a 'manage' folder sibling to 'login'
        return true;
    }
    return false;
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearLoginError();

        if (isLockedOut()) {
            const lockoutEndTime = parseInt(localStorage.getItem('lockoutTime'));
            const remainingTimeMs = lockoutEndTime - Date.now();
            const remainingMinutes = Math.ceil(remainingTimeMs / (1000 * 60));
            showLoginError(`Too many failed attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`);
            return;
        }

        toggleLoading(true);
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch(LOGIN_ENDPOINT, { // API Endpoint for login
                method: 'POST', // Method for login
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }) // Request body for login
            });

            if (!response.ok) {
                localStorage.removeItem('jwtToken'); // Ensure no old token lingers
                const attempts = incrementFailedAttempts();
                let errorMessage;

                if (attempts >= MAX_LOGIN_ATTEMPTS) {
                    const lockoutEndTime = parseInt(localStorage.getItem('lockoutTime'));
                    const remainingMinutes = Math.ceil((lockoutEndTime - Date.now()) / (1000 * 60));
                    errorMessage = `Too many failed attempts. Your account is locked. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`;
                    if (loginForm) loginForm.querySelector('button[type="submit"]').disabled = true;
                } else {
                    const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempts;
                    if (response.status === 401) { // Unauthorized response for invalid credentials
                        errorMessage = `Invalid username or password. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`;
                    } else {
                        errorMessage = `Login failed (status: ${response.status}). ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`;
                    }
                }
                throw new Error(errorMessage);
            }

            const { token } = await response.json(); // Successful login returns a token
            resetLoginAttempts();
            localStorage.setItem('jwtToken', token);
            window.location.href = '/manage'; // Redirect on successful login
        } catch (error) {
            showLoginError(error.message);
        } finally {
            toggleLoading(false);
        }
    });
}

// Run initial checks when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (!handleInitialPageLoad()) {
        // If not locked out and not redirected, ensure form is enabled.
        if (loginForm) loginForm.querySelector('button[type="submit"]').disabled = false;
    }
});
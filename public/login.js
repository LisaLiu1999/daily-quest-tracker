// public/login.js
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (result.success) {
            // --- 這是修正的地方 ---
            // 您的新後端回傳的是 'accessToken'
            localStorage.setItem('accessToken', result.accessToken); 
            // ---------------------
            
            // (後端的 HttpOnly refresh cookie 已經自動設定好了)
            window.location.href = 'index.html'; 
        } else {
            errorMessage.textContent = result.message || 'Login failed.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    }
});
// public/auth-handler.js

// 1. 取得 URL 中的 Token
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (token) {
    // 2. 將 Access Token 存入 localStorage
    // (名稱必須是 'accessToken' 才能與 api.js 配合)
    localStorage.setItem('accessToken', token);
    
    // 3. 重定向到主應用程式 (index.html)
    window.location.replace('index.html'); 
} else {
    // 4. 如果 Google 回呼中沒有 token (或失敗)，送回登入頁
    window.location.replace('login.html?error=auth_failed');
}
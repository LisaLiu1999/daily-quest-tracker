// public/api.js
// (Part C) 這是升級後的版本，它會自動處理 Refresh Tokens

// 取得新 Access Token 的函數
async function getNewAccessToken() {
    try {
        const response = await fetch('/refresh_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
            localStorage.setItem('accessToken', result.accessToken); // 儲存新的 Token
            return result.accessToken;
        } else {
            return null; // 刷新失敗
        }
    } catch (error) {
        return null;
    }
}


/**
 * 處理所有 API 請求的通用函數
 * @param {string} endpoint - API 路徑
 * @param {object} options - fetch 請求的設定
 * @param {boolean} isRetry - (內部使用) 標記這是否為重試
 * @returns {Promise<any>} - 回傳完整的 API 成功響應
 */
export async function fetchData(endpoint, options = {}, isRetry = false) {
    try {
        // 1. 從 localStorage 取得 Access Token
        const token = localStorage.getItem('accessToken'); 

        // 2. 準備 Headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        // 3. (Part C) 如果 Token 存在，加入 'Authorization: Bearer' 標頭
        if (token) {
            headers['Authorization'] = `Bearer ${token}`; 
        }
        
        const response = await fetch(endpoint, {
            ...options,
            headers: headers,
        }); 

        // --- (Part C) 這是關鍵的 401 (Token 過期) 處理 ---
        if (response.status === 401 && !isRetry) {
            // Access Token 過期了！
            console.log('Access Token expired. Attempting to refresh...');
            
            const newAccessToken = await getNewAccessToken();
            
            if (newAccessToken) {
                // 刷新成功！重試請求
                console.log('Token refreshed. Retrying original request...');
                return await fetchData(endpoint, options, true); 
            } else {
                // 4. 刷新失敗 (Refresh Token 也過期了)
                console.log('Refresh Token failed. Redirecting to login.');
                localStorage.removeItem('accessToken');
                window.location.href = 'login.html';
                
                // --- 這是修正的地方 ---
                // 我們不再 throw new Error
                // 而是回傳一個永遠不會 "resolve" 的 Promise
                // 這樣 app.js 的 .catch() 就不會被觸發
                return new Promise(() => {}); 
            }
        }
        
        if (response.status === 401 && isRetry) {
             // 如果重試 /refresh_token 仍然 401
             console.log('Refresh attempt failed. Redirecting to login.');
             localStorage.removeItem('accessToken');
             window.location.href = 'login.html';
             
             // --- 這是修正的地方 ---
             return new Promise(() => {}); 
        }

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson = {};
            try { errorJson = JSON.parse(errorText); } catch(e) {}
            // 回傳更詳細的錯誤訊息
            throw new Error(errorJson.message || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
            return result; 
        } else {
            throw new Error(result.message || 'API request failed');
        }
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error; // 讓 app.js 捕捉 "非 401" 的錯誤 (例如 500 Server Error)
    }
}
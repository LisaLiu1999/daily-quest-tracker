// public/profile.js
import { fetchData } from './api.js';

// (Part 4) 處理登出
document.getElementById('logout-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        await fetch('/logout', { method: 'POST' }); 
    } catch (error) {
        console.error('Logout failed on server:', error);
    }
    localStorage.removeItem('accessToken');
    window.location.href = 'login.html';
});

// (Part 3) 載入使用者儀表板
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    try {
        const result = await fetchData('/profile');
        const profile = result.data; 
        
        // (Part 3) Output Encoding - 安全地渲染，防止 XSS
        // 1. 先建立靜態骨架
        container.innerHTML = `
            <div class="profile-header">
                <h2 class="profile-username"></h2> <p class="profile-level">Level ${profile.level}</p> 
            </div>
            <div class="profile-stats">
                <div class="stat-item">
                    <div class="stat-label">Current XP</div>
                    <div class="stat-value" id="stat-xp"></div> </div>
                <div class="stat-item">
                    <div class="stat-label">Total XP</div>
                    <div class="stat-value" id="stat-total-xp"></div> </div>
                <div class="stat-item">
                    <div class="stat-label">Badges Earned</div>
                    <div class="stat-value" id="stat-badges"></div> </div>
            </div>
            <div class="profile-badges">
                <h3>Your Badges</h3>
                <div class="badges-list" id="badges-list">
                    </div>
            </div>
        `;

        // 2. 使用 .textContent 安全地填入動態資料
        container.querySelector('.profile-username').textContent = profile.username;
        container.querySelector('#stat-xp').textContent = profile.xp;
        container.querySelector('#stat-total-xp').textContent = profile.totalXP;
        container.querySelector('#stat-badges').textContent = profile.badges.length;

        // 3. 安全地渲染徽章列表
        const badgeList = container.querySelector('#badges-list');
        badgeList.innerHTML = ''; // 清空
        profile.badges.forEach(badgeName => {
            const badgeEl = document.createElement('span');
            badgeEl.className = 'badge-item';
            badgeEl.textContent = badgeName; // <-- 安全
            badgeList.appendChild(badgeEl);
        });

        // (Part 3) 將載入的資料填入下方的更新表單
        document.getElementById('name').value = profile.username || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('bio').value = profile.bio || '';

    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load profile: ${error.message}</div>`;
    }
}

// (Part 3) 處理表單提交
async function handleProfileUpdate(e) {
    e.preventDefault(); 
    
    const messageEl = document.getElementById('update-message');
    messageEl.textContent = 'Updating...';
    messageEl.className = 'form-message';

    const formData = {
        username: document.getElementById('name').value,
        email: document.getElementById('email').value,
        bio: document.getElementById('bio').value,
    };

    try {
        const result = await fetchData('/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (result.success) {
            messageEl.textContent = result.message;
            messageEl.classList.add('success');
            loadProfile(); // 成功後，重新載入 profile 資訊
        } else {
            const errorMsg = result.errors ? result.errors[0].msg : result.message;
            messageEl.textContent = errorMsg;
            messageEl.classList.add('error');
        }

    } catch (error) {
        messageEl.textContent = `Error: ${error.message}`;
        messageEl.classList.add('error');
    }
}

// 綁定事件
document.addEventListener('DOMContentLoaded', loadProfile);
document.getElementById('profile-update-form').addEventListener('submit', handleProfileUpdate);
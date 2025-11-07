// app.js
import { fetchData } from './api.js';

const questsContainer = document.getElementById('questsContainer');

// Fetch and display quests
async function loadQuests() {
    try {
        const result = await fetchData('/quests'); 
        const quests = result.data; 
        const completed = quests.filter(q => q.completed).length;
        
        document.getElementById('totalQuests').textContent = `Total Quests: ${quests.length}`;
        document.getElementById('completedQuests').textContent = `Completed: ${completed}`;
        
        questsContainer.innerHTML = quests.map(quest => `
            <div class="quest-card ${quest.completed ? 'completed' : ''}">
                <div class="quest-header">
                    <div>
                        <h3 class="quest-title">${quest.title}</h3>
                        <span class="quest-category">${quest.category}</span>
                    </div>
                    <div class="quest-xp">+${quest.xp} XP</div>
                </div>
                <div class="quest-footer">
                    ${quest.completed 
                        ? '<span class="completed-badge">✓ Completed</span>'
                        : `<button class="complete-btn" data-id="${quest._id}">Complete Quest</button>`
                    }
                </div>
            </div>
        `).join('');
    } catch (error) {
        questsContainer.innerHTML = `<div class="error">Failed to load quests: ${error.message}</div>`;
    }
}

// 處理點擊 "Complete" 按鈕
async function handleCompleteQuest(questId, buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = 'Processing...';
    try {
        const result = await fetchData(`/quests/${questId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        alert(result.message || 'Quest completed!');
        loadQuests(); 
    } catch (error) {
        alert(`Error: ${error.message}`);
        buttonElement.disabled = false;
        buttonElement.textContent = 'Complete Quest';
    }
}

// 事件委派
questsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('complete-btn')) {
        const questId = event.target.dataset.id;
        handleCompleteQuest(questId, event.target);
    }
});

// --- (Part C) 登出邏輯 (修正版) ---
document.addEventListener('DOMContentLoaded', () => {
    loadQuests(); // 執行您原有的 loadQuests

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // 1. 呼叫後端登出，以清除 HttpOnly cookie
            try {
                await fetch('/logout', { method: 'POST' }); 
            } catch (error) {
                console.error('Logout failed on server:', error);
            }
            
            // 2. 清除前端的 Access Token
            localStorage.removeItem('accessToken');
            
            // 3. 重定向到登入頁面
            window.location.href = 'login.html';
        });
    }
});
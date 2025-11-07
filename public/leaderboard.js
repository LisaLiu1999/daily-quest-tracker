// leaderboard.js
import { fetchData } from './api.js';

// --- 新增登出邏輯 ---
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
// --------------------

// Fetch and display leaderboard
async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    try {
        const result = await fetchData('/leaderboard'); 
        const leaderboard = result.data; 
        container.innerHTML = leaderboard.map(user => {
            let rankClass = '';
            if (user.rank === 1) { rankClass = 'first'; }
            else if (user.rank === 2) { rankClass = 'second'; }
            else if (user.rank === 3) { rankClass = 'third'; }
            
            return `
                <div class="leaderboard-item">
                    <div class="rank ${rankClass}">#${user.rank}</div>
                    <div class="user-info">
                        <div class="username">${user.username}</div>
                        <div class="user-stats">
                            <span>Level ${user.level}</span>
                            <span>${user.totalXP.toLocaleString()} XP</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load leaderboard: ${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadLeaderboard);
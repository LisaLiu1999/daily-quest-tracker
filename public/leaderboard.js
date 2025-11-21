import { fetchData } from './api.js';

document.getElementById('logout-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await fetch('/logout', { method: 'POST' }); } catch (e) {}
    localStorage.removeItem('accessToken');
    window.location.href = 'login.html';
});

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    try {
        const result = await fetchData('/leaderboard'); 
        const listHtml = result.data.map((user, index) => {
            const rank = index + 1;
            let rankClass = 'rank-num';
            if (rank === 1) rankClass += ' rank-1';
            if (rank === 2) rankClass += ' rank-2';
            if (rank === 3) rankClass += ' rank-3';

            return `
                <div class="leaderboard-row">
                    <div class="${rankClass}">${rank}</div>
                    <div>
                        <div style="font-weight:700; font-size:1.1rem;">${user.username}</div>
                        <div style="font-size:0.85rem; color:var(--text-light);">Level ${user.level}</div>
                    </div>
                    <div style="text-align:right; font-weight:800; color:var(--primary-dark);">
                        ${user.totalXP.toLocaleString()} XP
                    </div>
                </div>
            `;
        }).join('');
        container.innerHTML = `<div class="leaderboard-list">${listHtml}</div>`;
    } catch (error) {
        container.innerHTML = 'Failed to load.';
    }
}

document.addEventListener('DOMContentLoaded', loadLeaderboard);
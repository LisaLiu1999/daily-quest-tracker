// badges.js
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

// Fetch and display badges
async function loadBadges() {
    const container = document.getElementById('badgesContainer');
    try {
        const result = await fetchData('/badges'); 
        const badges = result.data; 
        
        if (!badges || badges.length === 0) {
            container.innerHTML = `<div class="error" style="background: var(--primary-color-dark);">No badges found. The database might be empty.</div>`;
            return;
        }
        container.innerHTML = badges.map(badge => `
            <div class="badge-card">
                <h3 class="badge-name">${badge.name}</h3>
                <p class="badge-description">${badge.description}</p>
                <div class="badge-requirement">
                    ${badge.xpRequired > 0 ? `Requires: ${badge.xpRequired.toLocaleString()} XP` : 'Starter Badge'}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = `<div class="error">Failed to load badges: ${error.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadBadges);
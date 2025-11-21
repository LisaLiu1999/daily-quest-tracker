import { fetchData } from './api.js';

document.getElementById('logout-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await fetch('/logout', { method: 'POST' }); } catch (e) {}
    localStorage.removeItem('accessToken');
    window.location.href = 'login.html';
});

const badgeIconSvg = '<svg class="badge-icon-svg" viewBox="0 0 24 24"><path d="M12 2l-3 6-6 1 4 4-1 6 6-3 6 3-1-6 4-4-6-1z"/></svg>'; 

async function loadBadges() {
    const container = document.getElementById('badgesContainer');
    try {
        const result = await fetchData('/badges'); 
        container.innerHTML = result.data.map(badge => `
            <div class="badge-card">
                ${badgeIconSvg}
                <h3 style="margin-bottom:8px; font-size:1.1rem;">${badge.name}</h3>
                <p style="font-size:0.9rem; color:var(--text-light); margin-bottom:12px;">
                    ${badge.description}
                </p>
                <span class="xp-badge" style="font-size:0.8rem; padding:4px 10px;">
                    ${badge.xpRequired > 0 ? `Req: ${badge.xpRequired} XP` : 'Starter'}
                </span>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = 'Failed to load.';
    }
}

document.addEventListener('DOMContentLoaded', loadBadges);
import { fetchData } from './api.js';

const questsContainer = document.getElementById('questsContainer');

// SVG Icons
const icons = {
    heart: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    bolt: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/></svg>',
    book: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
    star: '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>'
};

function getCategoryIcon(category) {
    if (!category) return icons.star; 
    const cat = category.toLowerCase();
    if (cat.includes('health') || cat.includes('wellness')) return icons.heart;
    if (cat.includes('fitness')) return icons.bolt;
    if (cat.includes('learn') || cat.includes('read')) return icons.book;
    return icons.star;
}

async function loadQuests() {
    try {
        const result = await fetchData('/quests'); 
        const quests = result.data; 
        const completed = quests.filter(q => q.completed).length;
        
        document.getElementById('totalQuests').textContent = `${quests.length}`;
        document.getElementById('completedQuests').textContent = `Completed: ${completed}`;
        
        questsContainer.innerHTML = quests.map(quest => `
            <div class="quest-card ${quest.completed ? 'completed' : ''}">
                <div>
                    <div class="quest-header">
                        <div class="category-tag">
                            ${getCategoryIcon(quest.category)}
                            ${quest.category}
                        </div>
                        <div class="xp-badge">+${quest.xp} XP</div>
                    </div>
                    <h3 class="quest-title">${quest.title}</h3>
                </div>
                
                <div>
                    ${quest.completed 
                        ? '<button class="complete-btn" disabled>Completed</button>'
                        : `<button class="complete-btn" data-id="${quest._id}">Start Quest</button>`
                    }
                </div>
            </div>
        `).join('');
    } catch (error) {
        questsContainer.innerHTML = `<div style="color:var(--text-light)">Failed to load quests.</div>`;
    }
}

async function handleCompleteQuest(questId, buttonElement) {
    buttonElement.disabled = true; buttonElement.textContent = '...';
    try {
        const result = await fetchData(`/quests/${questId}/complete`, { method: 'POST' });
        loadQuests(); 
    } catch (error) {
        alert(`Error: ${error.message}`);
        buttonElement.disabled = false; buttonElement.textContent = 'Start Quest';
    }
}

questsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('complete-btn')) {
        handleCompleteQuest(event.target.dataset.id, event.target);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadQuests();
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try { await fetch('/logout', { method: 'POST' }); } catch (e) {}
            localStorage.removeItem('accessToken');
            window.location.href = 'login.html';
        });
    }
});
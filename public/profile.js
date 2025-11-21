import { fetchData } from './api.js';

// Handle logout
document.getElementById('logout-button').addEventListener('click', async (e) => {
    e.preventDefault();
    try { await fetch('/logout', { method: 'POST' }); } catch (e) {}
    localStorage.removeItem('accessToken');
    window.location.href = 'login.html';
});

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    container.className = "profile-layout"; 

    try {
        console.log('Loading Profile...'); // [Debug]
        
        // Add timestamp parameter (?t=...) to force browser not to cache, ensuring latest data is seen
        const result = await fetchData(`/profile?t=${Date.now()}`);
        const profile = result.data; 
        const initial = profile.username ? profile.username.charAt(0).toUpperCase() : 'U';

        container.innerHTML = `
            <aside class="profile-sidebar">
                <div class="avatar-circle">${initial}</div>
                <h2 style="margin-bottom:4px; font-size:1.5rem;">${profile.username}</h2>
                <p style="color:var(--text-light); font-size:0.9rem;">${profile.email}</p>
                <div class="level-pill">Level ${profile.level}</div>
            </aside>

            <main class="profile-content">
                <div class="stats-row">
                    <div class="stat-box">
                        <span class="stat-num">${profile.xp}</span>
                        <span class="stat-label">Current XP</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-num">${profile.totalXP}</span>
                        <span class="stat-label">Lifetime XP</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-num">${profile.badges ? profile.badges.length : 0}</span>
                        <span class="stat-label">Badges</span>
                    </div>
                </div>

                <div class="form-card">
                    <h3 style="margin-bottom:20px; font-family:'Montserrat', sans-serif;">Edit Profile</h3>
                    <form id="profile-update-form">
                        <div class="form-group">
                            <label for="name">Display Name</label>
                            <input type="text" id="name" value="${profile.username || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" value="${profile.email || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="bio">Bio (Encrypted)</label>
                            <textarea id="bio" rows="4">${profile.bio || ''}</textarea>
                        </div>
                        <button type="submit" class="complete-btn" style="margin-top:0">Save Changes</button>
                        <p id="update-message" style="margin-top:10px; text-align:center; font-weight:700; min-height: 1.2em;"></p>
                    </form>
                </div>
            </main>
        `;

        // Bind form event
        const form = document.getElementById('profile-update-form');
        if(form){
            form.addEventListener('submit', handleProfileUpdate);
            console.log('Form event bound'); // [Debug]
        }

    } catch (error) {
        console.error('Load Error:', error);
        container.innerHTML = `<div style="color:red">Failed to load: ${error.message}</div>`;
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault(); 
    console.log('Starting form submission...'); // [Debug]

    const messageEl = document.getElementById('update-message');
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = 'Saving...';
    messageEl.textContent = '';

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

        console.log('Server Response:', result); // [Debug]

        if (result.success) {
            messageEl.textContent = 'Saved successfully!';
            messageEl.style.color = 'var(--primary)';
            
            // Add alert to let user know explicitly it succeeded
            alert("Update successful! The page will refresh.");
            
            // Delay refresh slightly
            setTimeout(() => loadProfile(), 500); 
        } else {
            const errorMsg = result.errors ? result.errors[0].msg : result.message;
            messageEl.textContent = errorMsg;
            messageEl.style.color = 'red';
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    } catch (error) {
        console.error('Update Failed:', error);
        messageEl.textContent = `Error: ${error.message}`;
        messageEl.style.color = 'red';
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}

document.addEventListener('DOMContentLoaded', loadProfile);
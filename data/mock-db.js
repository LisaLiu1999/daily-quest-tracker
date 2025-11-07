// data/mock-db.js
// 這是 seeder 腳本的資料來源

const quests = [
  { id: 1, title: 'Morning Meditation', xp: 50, category: 'wellness', completed: false },
  { id: 2, title: 'Exercise 30min', xp: 100, category: 'fitness', completed: false },
  { id: 3, title: 'Read for 20min', xp: 75, category: 'learning', completed: false },
  { id: 4, title: 'Drink 8 glasses of water', xp: 60, category: 'health', completed: false },
  { id: 5, title: 'Practice coding', xp: 150, category: 'learning', completed: false }
];

const userProfile = {
  username: 'QuestMaster',
  level: 5,
  xp: 1250,
  totalXP: 3750,
  badges: ['Early Bird', 'Bookworm']
};

const leaderboard = [
    { username: 'DragonSlayer', level: 15, totalXP: 15000 },
    { username: 'MysticMage', level: 12, totalXP: 12500 },
    { username: 'ShadowNinja', level: 10, totalXP: 10200 },
    { username: 'NoobSlayer', level: 3, totalXP: 1500 }
];

const badges = [
    { name: 'Early Bird', description: 'Complete a quest before 8 AM', xpRequired: 0 },
    { name: 'Fitness Enthusiast', description: 'Complete 10 fitness quests', xpRequired: 1000 },
    { name: 'Bookworm', description: 'Complete 20 reading quests', xpRequired: 1500 },
    { name: 'Legend', description: 'Reach level 10', xpRequired: 5000 },
    { name: 'Master', description: 'Reach level 20', xpRequired: 10000 }
];

// 匯出資料
module.exports = {
  quests,
  userProfile,
  leaderboard,
  badges
};
// seeder.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs'); 
const connectDB = require('./config/db');

// 載入 Models
const Quest = require('./models/Quest');
const Badge = require('./models/Badge');
const User = require('./models/User');

// 載入模擬資料
const { quests, badges, leaderboard } = require('./data/mock-db');

// 載入 .env
dotenv.config();

// 連線資料庫
connectDB();

const importData = async () => {
  try {
    // 1. 清除舊資料
    await Quest.deleteMany();
    await Badge.deleteMany();
    await User.deleteMany();
    console.log('🧹 資料清除完畢...');

    // 2. 植入任務和徽章
    await Quest.insertMany(quests);
    await Badge.insertMany(badges);
    console.log('✅ 任務 (Quests) 和徽章 (Badges) 植入成功！');

    // 3. 建立使用者
    
    // 建立排行榜假用戶 (他們是 'User')
    const otherUsers = leaderboard.map(u => ({
        ...u,
        email: `${u.username.toLowerCase()}@example.com`,
        password: 'hashed_password_placeholder',
        role: 'User' // <-- 明確設定為 'User'
    }));
    await User.insertMany(otherUsers);

    // 建立我們真正的主使用者
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt); 

    await User.create({
        username: 'QuestMaster',
        email: 'questmaster@example.com', 
        password: hashedPassword,
        
        // --- (Part B) 這是關鍵的修正 ---
        role: 'Admin', // <-- 將 QuestMaster 設定為管理員
        // ---------------------------------

        level: 5,
        xp: 1250,
        totalXP: 3750,
        badges: ['Early Bird', 'Bookworm']
    });
    
    console.log('✅ 使用者 (Users) 植入成功！');
    console.log('---');
    console.log('🔑 您的主要管理員 (Admin) 帳號：'); // <-- 更新日誌
    console.log('   Email: questmaster@example.com');
    console.log('   Password: password123');
    console.log('---');
    console.log('🌱 資料庫植入完成！ 🌱');
    process.exit();
  } catch (error) {
    console.error(`植入失敗: ${error}`);
    process.exit(1);
  }
};

// 刪除資料的函數 (保持不變)
const destroyData = async () => {
  try {
    await Quest.deleteMany();
    await Badge.deleteMany();
    await User.deleteMany();
    console.log('🔥 資料已全部銷毀！ 🔥');
    process.exit();
  } catch (error) {
    console.error(`銷毀失敗: ${error}`);
    process.exit(1);
  }
};


if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
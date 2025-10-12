const express = require('express');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helmet middleware for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Mock database for Daily Quest Tracker
let quests = [
  { id: 1, title: 'Morning Meditation', xp: 50, category: 'wellness', completed: false },
  { id: 2, title: 'Exercise 30min', xp: 100, category: 'fitness', completed: false },
  { id: 3, title: 'Read for 20min', xp: 75, category: 'learning', completed: false },
  { id: 4, title: 'Drink 8 glasses of water', xp: 60, category: 'health', completed: false },
  { id: 5, title: 'Practice coding', xp: 150, category: 'learning', completed: false }
];

let userProfile = {
  id: 1,
  username: 'QuestMaster',
  level: 5,
  xp: 1250,
  totalXP: 3750,
  badges: ['Early Bird', 'Fitness Enthusiast', 'Bookworm']
};

// Cache control middleware
const setCacheControl = (duration, options = {}) => {
  return (req, res, next) => {
    const { revalidate = false, private: isPrivate = false, noStore = false } = options;
    
    if (noStore) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    } else if (isPrivate) {
      res.set('Cache-Control', `private, max-age=${duration}`);
    } else if (revalidate) {
      res.set('Cache-Control', `public, max-age=${duration}, stale-while-revalidate=${duration * 2}`);
    } else {
      res.set('Cache-Control', `public, max-age=${duration}`);
    }
    next();
  };
};

// Routes

// 1. GET /quests - Returns all quests
// Cache: 5 minutes with stale-while-revalidate
// Security: Public data, safe to cache
app.get('/quests', setCacheControl(300, { revalidate: true }), (req, res) => {
  res.json({
    success: true,
    data: quests,
    message: 'All quests retrieved successfully'
  });
});

// 2. GET /quests/:id - Fetch a specific quest by ID
// Cache: 5 minutes
// Security: Individual quest data, public and cacheable
app.get('/quests/:id', setCacheControl(300), (req, res) => {
  const questId = parseInt(req.params.id);
  const quest = quests.find(q => q.id === questId);
  
  if (!quest) {
    return res.status(404).json({
      success: false,
      message: 'Quest not found'
    });
  }
  
  res.json({
    success: true,
    data: quest
  });
});

// 3. GET /profile - Get user profile
// Cache: No caching (contains sensitive user data)
// Security: User-specific data should not be cached
app.get('/profile', setCacheControl(0, { noStore: true }), (req, res) => {
  res.json({
    success: true,
    data: userProfile,
    message: 'Profile data retrieved'
  });
});

// 4. POST /quests/:id/complete - Mark a quest as complete
// Cache: No caching (state-changing operation)
// Security: Modifies data, must not be cached
app.post('/quests/:id/complete', setCacheControl(0, { noStore: true }), (req, res) => {
  const questId = parseInt(req.params.id);
  const quest = quests.find(q => q.id === questId);
  
  if (!quest) {
    return res.status(404).json({
      success: false,
      message: 'Quest not found'
    });
  }
  
  if (quest.completed) {
    return res.status(400).json({
      success: false,
      message: 'Quest already completed'
    });
  }
  
  quest.completed = true;
  userProfile.xp += quest.xp;
  userProfile.totalXP += quest.xp;
  
  res.json({
    success: true,
    data: {
      quest,
      updatedProfile: userProfile
    },
    message: `Quest completed! Earned ${quest.xp} XP`
  });
});

// 5. GET /leaderboard - Get public leaderboard
// Cache: 10 minutes (less frequent updates needed)
// Security: Public aggregate data, safe to cache longer
app.get('/leaderboard', setCacheControl(600), (req, res) => {
  const leaderboard = [
    { rank: 1, username: 'DragonSlayer', level: 15, totalXP: 15000 },
    { rank: 2, username: 'MysticMage', level: 12, totalXP: 12500 },
    { rank: 3, username: 'ShadowNinja', level: 10, totalXP: 10200 },
    { rank: 4, username: 'QuestMaster', level: 5, totalXP: 3750 },
    { rank: 5, username: 'NoobSlayer', level: 3, totalXP: 1500 }
  ];
  
  res.json({
    success: true,
    data: leaderboard,
    message: 'Leaderboard retrieved'
  });
});

// 6. GET /badges - Get available badges
// Cache: 1 hour (static content, rarely changes)
// Security: Static reference data, safe for long caching
app.get('/badges', setCacheControl(3600), (req, res) => {
  const badges = [
    { id: 1, name: 'Early Bird', description: 'Complete a quest before 8 AM', xpRequired: 0 },
    { id: 2, name: 'Fitness Enthusiast', description: 'Complete 10 fitness quests', xpRequired: 1000 },
    { id: 3, name: 'Bookworm', description: 'Complete 20 reading quests', xpRequired: 1500 },
    { id: 4, name: 'Legend', description: 'Reach level 10', xpRequired: 5000 },
    { id: 5, name: 'Master', description: 'Reach level 20', xpRequired: 10000 }
  ];
  
  res.json({
    success: true,
    data: badges,
    message: 'All badges retrieved'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Daily Quest Tracker API',
    version: '1.0.0',
    endpoints: {
      quests: '/quests',
      singleQuest: '/quests/:id',
      profile: '/profile',
      completeQuest: '/quests/:id/complete',
      leaderboard: '/leaderboard',
      badges: '/badges'
    }
  });
});

// SSL Configuration
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
};

// Create HTTPS server
const server = https.createServer(sslOptions, app);

server.listen(PORT, () => {
  console.log(`🚀 Secure HTTPS Server running on https://localhost:${PORT}`);
  console.log('🔒 SSL/TLS encryption enabled');
  console.log('🛡️  Security headers configured with Helmet');
  console.log('\nAvailable endpoints:');
  console.log('  GET  /quests');
  console.log('  GET  /quests/:id');
  console.log('  GET  /profile');
  console.log('  POST /quests/:id/complete');
  console.log('  GET  /leaderboard');
  console.log('  GET  /badges');
});

module.exports = app;
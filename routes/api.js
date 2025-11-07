// routes/api.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// 引入輔助工具和中介軟體
// const { encrypt, decrypt } = require('../utils/crypto'); // <-- 已移除 (Phase 3 的要求)
const auth = require('../middleware/auth'); 
const admin = require('../middleware/admin'); // (Part B)

// 引入 Models
const Quest = require('../models/Quest');
const User = require('../models/User');
const Badge = require('../models/Badge');

// --- ============================ ---
// --- 輔助函數 (Helpers) ---
// --- ============================ ---

/**
 * (Part D) 登入/註冊的流量限制器
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分鐘
    max: 10, // 限制每個 IP 在 15 分鐘內最多 10 次
    message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * (Part C) 產生 JWT Tokens (Access & Refresh)
 */
const generateTokens = (user) => {
    // 存取權杖 (短效期，用於 API 驗證)
    const accessToken = jwt.sign(
        // (Part B) 將 'role' 和 'username' 加入 Access Token
        { user: { id: user.id, role: user.role, username: user.username } },
        process.env.JWT_SECRET,
        { expiresIn: '15m' } // 15 分鐘
    );
    // 刷新權杖 (長效期，用於取得新的 Access Token)
    const refreshToken = jwt.sign(
        { user: { id: user.id } },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '30d' } // 30 天
    );
    return { accessToken, refreshToken };
};

/**
 * 快取中介軟體 (保持不變)
 */
const setCacheControl = (duration, options = {}) => {
  return (req, res, next) => {
    const { noStore = false } = options;
    if (noStore) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    } else {
      res.set('Cache-Control', `public, max-age=${duration}`);
    }
    next();
  };
};

// --- ============================ ---
// --- 認證路由 (Authentication) ---
// --- ============================ ---

/**
 * @route   POST /register
 * @desc    (Part A) 註冊新使用者 (含限速)
 * @access  Public
 */
router.post('/register', authLimiter, [
    // (Part B) 驗證
    body('username', 'Username is required').not().isEmpty().trim().escape(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be 6 or more characters').isLength({ min: 6 })
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { username, email, password } = req.body;
        
        // (已移除 Crypto) - 使用明文 email 查詢
        let user = await User.findOne({ email: email });
        if (user) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        user = new User({
            username,
            email: email, // <-- 儲存明文 email
            password,
            role: 'User' // (Part B) 預設角色
        });

        // (Part A) 雜湊密碼
        const salt = await bcrypt.genSalt(10); 
        user.password = await bcrypt.hash(password, salt); 
        await user.save();

        // (Part C) 產生 Tokens 並設定 Cookie
        const { accessToken, refreshToken } = generateTokens(user);

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // JavaScript 無法存取
            secure: true,   // 僅限 HTTPS
            sameSite: 'strict', // 僅限同站
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 天
        });
        
        // 回傳 "Access Token" 給前端
        res.json({ success: true, accessToken });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /login
 * @desc    (Part A) 登入本地使用者 (含限速)
 * @access  Public
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // (已移除 Crypto) - 使用明文 email 查詢
    const user = await User.findOne({ email: email }); 
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
    
    // 檢查是否為 Google 用戶 (沒有本地密碼)
    if (!user.password) {
        return res.status(400).json({ success: false, message: 'Please log in using Google SSO.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // (Part C) 產生 Tokens 並設定 Cookie
    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 天
    });
    
    res.json({ success: true, accessToken }); // 只回傳 Access Token

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   GET /auth/google
 * @desc    (Part A) 啟動 Google OAuth 流程
 * @access  Public
 */
router.get('/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'], 
        session: false 
    })
);

/**
 * @route   GET /auth/google/callback
 * @desc    (Part A) Google 驗證後的回呼路由
 * @access  Public
 */
router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/login.html?error=google_failed', 
        session: false 
    }), 
    (req, res) => {
        // --- Google 登入成功 ---
        // 'req.user' 是由 config/passport.js 傳來的 user 物件
        
        // (Part C) 產生我們自己的 Tokens
        const { accessToken, refreshToken } = generateTokens(req.user);

        // (Part D) 設定安全的 HttpOnly Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 天
        });
        
        // 重定向到 "auth-handler.html" (前端)
        res.redirect(`/auth-handler.html?token=${accessToken}`);
    }
);

/**
 * @route   POST /refresh_token
 * @desc    (Part C) 使用 Refresh Token 取得新的 Access Token
 * @access  Private (via Cookie)
 */
router.post('/refresh_token', (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        return res.status(401).json({ success: false, message: 'No refresh token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        
        // 驗證通過，為該 user ID 產生一個 "新的 Access Token"
        // (我們需要從 DB 撈取 user 確保資訊最新，但為求速度先簡化)
        const userPayload = { 
            user: { 
                id: decoded.user.id
                // (注意：auth.js 中介軟體必須更新為能處理只有 id 的 payload)
            } 
        };
        
        const newAccessToken = jwt.sign(
            userPayload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        res.json({ success: true, accessToken: newAccessToken });

    } catch (err) {
        return res.status(401).json({ success: false, message: 'Refresh token is not valid' });
    }
});

/**
 * @route   POST /logout
 * @desc    (Part F) 登出並清除 Cookie
 * @access  Public
 */
router.post('/logout', (req, res) => {
    // 清除 HttpOnly cookie
    res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        expires: new Date(0) // 立即過期
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// --- ============================ ---
// --- 受保護的使用者路由 ---
// --- ============================ ---

/**
 * @route   GET /quests
 * @desc    取得使用者的任務
 * @access  Private
 */
router.get('/quests', auth, async (req, res) => {
  try {
    // TODO: (Part B) 實作任務與使用者的關聯
    // (目前仍抓取所有任務)
    // const quests = await Quest.find({ user: req.user.id });
    const quests = await Quest.find().sort({ createdAt: -1 }); 
    res.json({ success: true, data: quests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /profile
 * @desc    (Part B) 取得使用者資料
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
  try {
    // auth 中介軟體已經附加了 req.user (一個完整的 User 物件)
    // 我們不需要再次查詢資料庫，除非我們需要最新的資料
    // const user = await User.findById(req.user.id).select('-password');
    // if (!user) {
    //    return res.status(404).json({ success: false, message: 'User not found' });
    // }
    
    // (已移除 Crypto) - 直接回傳來自 auth 中介軟體的 user 物件
    res.json({
      success: true,
      data: req.user, // 'req.user' 已被 .select('-password')
      message: 'Profile data retrieved'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @route   PUT /profile
 * @desc    (Phase 2) 驗證、清理並更新使用者資料
 * @access  Private
 */
router.put('/profile', [
    auth, // 1. 驗證 Token
    // 2. (Part B) Validation & Sanitization
    body('username', 'Name must be 3-50 alphabetic characters')
        .isString()
        .isLength({ min: 3, max: 50 })
        .isAlpha('en-US', {ignore: ' '})
        .trim().escape(),
    body('email', 'Please include a valid email')
        .isEmail()
        .normalizeEmail(),
    body('bio', 'Max 500 characters, no HTML or special characters.')
        .isLength({ max: 500 })
        .trim()
        .matches(/^[a-zA-Z0-9\s.,'!?]*$/)
        .escape()
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    try {
        const { username, email, bio } = req.body;

        // (已移除 Crypto) - 使用明文
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, 
            { 
                username: username,
                email: email, // <-- 儲存明文
                bio: bio
            },
            { new: true }
        ).select('-password');
        
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, data: updatedUser, message: 'Profile updated successfully' });

    } catch (err) {
        console.error(err.message);
        // 處理 email 重複的錯誤
        if (err.code === 11000) {
             return res.status(400).json({ success: false, message: 'Email already in use.' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/**
 * @route   POST /quests/:id/complete
 * @desc    完成一個任務
 * @access  Private
 */
router.post('/quests/:id/complete', auth, async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest) { return res.status(404).json({ success: false, message: 'Quest not found' }); }
    if (quest.completed) { return res.status(400).json({ success: false, message: 'Quest already completed' }); }
    
    // (Part B) TODO: 驗證這個任務是否屬於該使用者
    
    const user = await User.findById(req.user.id);
    if (!user) { return res.status(404).json({ success: false, message: 'User not found' }); }

    quest.completed = true;
    user.xp += quest.xp;
    user.totalXP += quest.xp;
    
    await quest.save();
    const updatedUser = await user.save();
    
    // (已移除 Crypto) - 回傳明M文
    res.json({
      success: true,
      data: { quest, updatedProfile: updatedUser.toObject() },
      message: `Quest completed! Earned ${quest.xp} XP`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- ============================ ---
// --- 受保護的管理員路由 (Admin) ---
// --- ============================ ---

/**
 * @route   GET /admin/test
 * @desc    (Part B) 只有 Admin 才能存取的測試路由
 * @access  Admin
 */
router.get('/admin/test', [auth, admin], (req, res) => {
    // 陣列 [auth, admin] 確保請求先通過 'auth' 再通過 'admin'
    res.json({
        success: true,
        message: `Welcome, Admin ${req.user.username}! You have accessed a protected route.`
    });
});

// --- ============================ ---
// --- 公開路由 (Public) ---
// --- ============================ ---

/**
 * @route   GET /leaderboard
 * @desc    取得公開排行榜
 * @access  Public
 */
router.get('/leaderboard', setCacheControl(600), async (req, res) => {
  try {
    const users = await User.find().select('username level totalXP').sort({ totalXP: -1 }).limit(10);
      
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      level: user.level,
      totalXP: user.totalXP,
    }));
      
    res.json({ success: true, data: leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /badges
 * @desc    取得所有可用的徽章
 * @access  Public
 */
router.get('/badges', setCacheControl(3600), async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json({ success: true, data: badges });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});


module.exports = router;
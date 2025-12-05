const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// 引入加密工具 (Phase 3)
const { encrypt, decrypt } = require('../utils/crypto'); 

const auth = require('../middleware/auth'); 
const admin = require('../middleware/admin');

const Quest = require('../models/Quest');
const User = require('../models/User');
const Badge = require('../models/Badge');

// 輔助函數
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 10, 
    message: { success: false, message: 'Too many login attempts, please try again later' },
    standardHeaders: true, legacyHeaders: false,
});

const generateTokens = (user) => {
    const accessToken = jwt.sign(
        { user: { id: user.id, role: user.role, username: user.username } },
        process.env.JWT_SECRET, { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { user: { id: user.id } },
        process.env.REFRESH_TOKEN_SECRET, { expiresIn: '30d' }
    );
    return { accessToken, refreshToken };
};

const setCacheControl = (duration, options = {}) => {
  return (req, res, next) => {
    const { noStore = false } = options;
    if (noStore) { res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); }
    else { res.set('Cache-Control', `public, max-age=${duration}`); }
    next();
  };
};

// --- 認證路由 ---

router.post('/register', authLimiter, [
    body('username', 'Username required').not().isEmpty().trim().escape(),
    body('email', 'Valid email required').isEmail().normalizeEmail(),
    body('password', 'Password min 6 chars').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
        const { username, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ success: false, message: 'Email exists' });

        user = new User({ username, email, password, role: 'User' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const { accessToken, refreshToken } = generateTokens(user);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30*24*60*60*1000 });
        res.json({ success: true, accessToken });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// [Fix] Part C: 修復 NoSQL Injection 漏洞
// 加入 express-validator 驗證 email 格式，防止傳入 MongoDB 查詢運算子物件
router.post('/login', authLimiter, [
    body('email', 'Valid email required').isEmail().normalizeEmail(),
    body('password', 'Password is required').exists()
], async (req, res) => {
    // [Fix] 檢查驗證錯誤
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Invalid input format', errors: errors.array() });
    }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });
    if (!user.password) return res.status(400).json({ success: false, message: 'Please use Google Login' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30*24*60*60*1000 });
    res.json({ success: true, accessToken });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login.html?error=google_failed', session: false }), 
    (req, res) => {
        const { accessToken, refreshToken } = generateTokens(req.user);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 30*24*60*60*1000 });
        res.redirect(`/auth-handler.html?token=${accessToken}`);
    }
);

router.post('/refresh_token', (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        const newAccessToken = jwt.sign({ user: { id: decoded.user.id } }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ success: true, accessToken: newAccessToken });
    } catch (err) { res.status(401).json({ success: false, message: 'Invalid token' }); }
});

router.post('/logout', (req, res) => {
    res.cookie('refreshToken', '', { httpOnly: true, secure: true, sameSite: 'strict', expires: new Date(0) });
    res.json({ success: true, message: 'Logged out' });
});

// --- 應用程式路由 ---

router.get('/profile', auth, async (req, res) => {
  try {
    const userProfile = req.user.toObject();
    // Phase 3: 解密 Bio
    if (userProfile.bio) userProfile.bio = decrypt(userProfile.bio);
    res.json({ success: true, data: userProfile });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/profile', [
    auth,
    body('username').isLength({ min: 3, max: 50 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('bio').isLength({ max: 500 }).trim().escape()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    try {
        const { username, email, bio } = req.body;
        // Phase 3: 加密 Bio
        const encryptedBio = encrypt(bio);
        
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { username, email, bio: encryptedBio },
            { new: true }
        ).select('-password');

        const responseUser = updatedUser.toObject();
        responseUser.bio = decrypt(responseUser.bio);
        res.json({ success: true, data: responseUser, message: 'Profile updated' });
    } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/quests', auth, async (req, res) => {
  try {
    const quests = await Quest.find().sort({ createdAt: -1 });
    res.json({ success: true, data: quests });
  } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.post('/quests/:id/complete', auth, async (req, res) => {
  try {
    const quest = await Quest.findById(req.params.id);
    if (!quest || quest.completed) return res.status(400).json({ success: false, message: 'Invalid quest' });
    
    const user = await User.findById(req.user.id);
    quest.completed = true;
    user.xp += quest.xp;
    user.totalXP += quest.xp;
    await quest.save();
    await user.save();
    res.json({ success: true, data: { quest, updatedProfile: user.toObject() }, message: `Completed! +${quest.xp} XP` });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/leaderboard', setCacheControl(600), async (req, res) => {
  try {
    const users = await User.find().select('username level totalXP').sort({ totalXP: -1 }).limit(10);
    const leaderboard = users.map((user, i) => ({ rank: i + 1, username: user.username, level: user.level, totalXP: user.totalXP }));
    res.json({ success: true, data: leaderboard });
  } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.get('/badges', setCacheControl(3600), async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json({ success: true, data: badges });
  } catch (err) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

router.get('/admin/test', [auth, admin], (req, res) => res.json({ success: true, message: 'Admin Access' }));

module.exports = router;
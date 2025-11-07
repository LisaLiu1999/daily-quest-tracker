// middleware/admin.js
// (Part B) 角色型存取控制 (RBAC) 守衛

module.exports = function(req, res, next) {
    // 這個中介軟體 "必須" 在 auth 中介軟體 "之後" 執行
    // 這樣我們才能存取到 req.user
    // (我們在 routes/api.js 的 generateTokens 中已將 role 加入 token)

    if (!req.user.role) {
        return res.status(403).json({ success: false, message: 'Forbidden: No role defined for user.' });
    }

    if (req.user.role !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Access denied. Requires Admin role.' });
    }

    // 如果是 Admin，則繼續
    next();
};
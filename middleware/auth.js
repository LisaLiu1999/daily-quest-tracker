// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // 我們需要 User model

module.exports = async function(req, res, next) {
  // 1. (Part C) 從 header 中取得 token (改成 Authorization)
  const authHeader = req.header('Authorization');

  // 2. 檢查 header
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }

  // 3. 驗證 Bearer 格式
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
     return res.status(401).json({ success: false, message: 'Token malformed' });
  }
  
  const token = tokenParts[1]; // 取得 'Bearer' 後面的 token

  // 4. 驗證 Access Token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // (Part B) 為了 RBAC，我們從 DB 撈取最新的 user (包含 role)
    // 這樣如果我們在後台撤銷了某人的 Admin，token 會立刻失效
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
         return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    req.user = user; // 附加完整的 user 物件 (包含 role)
    next();
  } catch (err) {
    // (Part C) Token 過期 (或無效)
    // 我們的 public/api.js 將會捕捉這個 401 錯誤，並呼叫 /refresh_token
    res.status(401).json({ success: false, message: 'Token is not valid (or expired)' });
  }
};
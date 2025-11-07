// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // --- (Part A) 新增 Google ID 欄位 ---
  googleId: {
    type: String,
    unique: true,
    sparse: true // 允許 'null' (不是每個人都用 Google 登入)
  },
  // ---------------------------------
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, 
  },
  password: {
    type: String,
    // 密碼不再是 "必需" 的，因為 Google 用戶沒有密碼
    required: false, 
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  level: {
    type: Number,
    default: 1,
  },
  xp: {
    type: Number,
    default: 0,
  },
  totalXP: {
    type: Number,
    default: 0,
  },
  badges: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model('User', userSchema);
// server.js
const express = require('express');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db'); 
const cookieParser = require('cookie-parser'); 
const passport = require('passport'); // <-- 1. 引入 Passport

dotenv.config();
connectDB();

// --- 2. 引入 Passport 設定 (在 connectDB 之後) ---
require('./config/passport')(passport);

const apiRoutes = require('./routes/api');
const app = express();
const PORT = 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // <-- 使用 cookieParser

// --- 3. 初始化 Passport ---
app.use(passport.initialize());

// --- Helmet & Static (保持不變) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"], // (確保允許 Google Fonts)
      scriptSrc: ["'self'"], 
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"], 
      fontSrc: ["'self'", "https://fonts.gstatic.com"], 
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes (保持不變) ---
app.use('/', apiRoutes);
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SSL & Server Start (保持不變) ---
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl', 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl', 'server.cert'))
};

const server = https.createServer(sslOptions, app);
server.listen(PORT, () => {
  console.log(`🚀 Secure HTTPS Server running on https://localhost:${PORT}`);
});

module.exports = app;
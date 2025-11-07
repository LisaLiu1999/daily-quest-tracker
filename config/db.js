// config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // 從 .env 檔案讀取連線字String
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`🔌 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // 讓應用程式在連線失敗時直接退出
    process.exit(1);
  }
};

module.exports = connectDB;
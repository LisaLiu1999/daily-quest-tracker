// models/Badge.js
const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  xpRequired: { type: Number, default: 0 },
});

module.exports = mongoose.model('Badge', badgeSchema);
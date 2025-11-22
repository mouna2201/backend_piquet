const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: 'farmer' },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
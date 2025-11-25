const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: 'farmer' },
  // Profil de parcelle
  parcelLocation: { type: String, default: '' },
  soilType: { type: String, default: '' },
  crops: { type: [String], default: [] },
  areaM2: { type: Number, default: 0 },
  hasCompletedFarmerForm: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
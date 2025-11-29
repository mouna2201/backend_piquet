const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: 'farmer' },
  // Profil de parcelle (pour fermiers)
  parcelLocation: { type: String, default: '' },
  soilType: { type: String, default: '' },
  crops: { type: [String], default: [] },
  areaM2: { type: Number, default: 0 },
  hasCompletedFarmerForm: { type: Boolean, default: false },
  // Profil superviseur (pour superviseurs)
  supervisorParcelLocation: { type: String, default: '' },
  supervisorSoilType: { type: String, default: '' },
  supervisorCrops: { type: [String], default: [] },
  supervisorHectares: { type: Number, default: 0 },
  hasCompletedSupervisorForm: { type: Boolean, default: false },
  // Historique des modifications
  cropHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CropHistory'
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
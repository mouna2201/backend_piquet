const mongoose = require('mongoose');

const cropWateringHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  cropName: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  soilType: {
    type: String,
    required: true
  },
  areaM2: {
    type: Number,
    required: true
  },
  lastWateringDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  waterUsedLiters: {
    type: Number,
    required: true,
    default: 0
  },
  notes: {
    type: String,
    default: ''
  }
}, { 
  timestamps: true 
});

// Index pour optimiser les requêtes
cropWateringHistorySchema.index({ userId: 1, cropName: 1, lastWateringDate: -1 });

module.exports = mongoose.model('CropWateringHistory', cropWateringHistorySchema);

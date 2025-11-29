const mongoose = require('mongoose');

const cropHistoryRecordSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // Informations de la parcelle
  location: {
    type: String,
    required: true
  },
  cropType: {
    type: String,
    required: true
  },
  area: {
    type: Number, // en m²
    required: true
  },
  soilType: {
    type: String,
    required: true
  },
  waterAmount: {
    type: Number, // en litres
    required: true
  },
  // Date de création de cet enregistrement
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Index pour optimiser les requêtes
cropHistoryRecordSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('CropHistoryRecord', cropHistoryRecordSchema);

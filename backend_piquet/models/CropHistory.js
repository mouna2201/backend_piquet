const mongoose = require('mongoose');

const cropHistorySchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  changeType: { 
    type: String, 
    enum: ['crop', 'location', 'soil', 'area'],
    required: true 
  },
  oldValue: { 
    type: mongoose.Schema.Types.Mixed,
    default: null 
  },
  newValue: { 
    type: mongoose.Schema.Types.Mixed,
    required: true 
  },
  changedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Index pour optimiser les requêtes
cropHistorySchema.index({ userId: 1, changedAt: -1 });

module.exports = mongoose.model('CropHistory', cropHistorySchema);
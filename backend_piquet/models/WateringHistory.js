const mongoose = require('mongoose');

const WateringHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    crop: {
      type: String,
      required: true,
    },
    areaM2: {
      type: Number,
      required: true,
      default: 0,
    },
    liters: {
      type: Number,
      required: true,
      default: 0,
    },
    wateredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

WateringHistorySchema.index({ userId: 1, wateredAt: -1 });

module.exports = mongoose.model('WateringHistory', WateringHistorySchema);

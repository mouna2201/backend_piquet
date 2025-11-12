const mongoose = require('mongoose');

const capteurSchema = new mongoose.Schema({
  device_id: {
    type: String,
    required: true,
    index: true
  },
  // Données sol
  humidite_sol: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Humidité du sol en pourcentage'
  },
  temperature_sol: {
    type: Number,
    min: -50,
    max: 100,
    description: 'Température du sol en °C'
  },
  // Données environnementales
  humidite: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Humidité de l\'air en pourcentage'
  },
  temperature: {
    type: Number,
    min: -50,
    max: 100,
    description: 'Température de l\'air en °C'
  },
  // Autres données
  pression: {
    type: Number,
    min: 800,
    max: 1200
  },
  latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  batterie: {
    type: Number,
    min: 0,
    max: 100
  },
  qualite_signal: {
    type: Number,
    min: 0,
    max: 100
  },
  timestamp_mesure: {
    type: Date,
    default: Date.now
  },
  // Métadonnées
  is_simulation: {
    type: Boolean,
    default: false
  },
  source_type: {
    type: String,
    enum: ['capteur_reel', 'node-red', 'test', 'simulation', 'soil_sensor'],
    default: 'soil_sensor'
  },
  type_capteur: {
    type: String,
    enum: ['soil_moisture', 'temperature', 'multi', 'environment'],
    default: 'multi'
  },
  notes: {
    type: String
  },
  raw_data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index optimisés pour les requêtes sol
capteurSchema.index({ device_id: 1, timestamp_mesure: -1 });
capteurSchema.index({ type_capteur: 1 });
capteurSchema.index({ humidite_sol: 1 });
capteurSchema.index({ temperature_sol: 1 });
capteurSchema.index({ is_simulation: 1 });

module.exports = mongoose.model('Capteur', capteurSchema);
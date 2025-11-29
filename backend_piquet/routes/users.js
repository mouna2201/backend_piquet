const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Capteur = require('../models/Capteur');
const { 
  getUserCropHistory, 
  trackCropChanges 
} = require('../controllers/cropHistoryController');

// Middleware d'authentification pour les routes admin
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant. Accès refusé.' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise_changez_moi';

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({
        message: 'Token invalide ou expiré',
        error: err.message,
      });
    }

    req.user = decoded;
    next();
  });
};
router.get('/users', /* auth, */ async (req, res) => {
  try {
    const role = req.query.role;
    const filter = {};
    if (role) filter.role = role; // role=farmer

    const users = await User.find(filter).select('-password');
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET - Liste complète des fermiers avec leurs données de capteur
router.get('/farmers', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const farmers = await User.find({ role: 'farmer' }).select('-password');

    // Récupérer les dernières données de capteur pour chaque fermier
    const farmersWithSensorData = await Promise.all(
      farmers.map(async (farmer) => {
        // Récupérer les dernières données de capteur (limit 10 par fermier)
        const sensorData = await Capteur.find()
          .sort({ timestamp_mesure: -1 })
          .limit(50);

        // Filtrer les données pertinentes pour ce fermier (vous pouvez adapter la logique)
        const relevantSensorData = sensorData.filter(data => 
          data.device_id && (
            data.device_id.includes('farm') || 
            data.device_id.includes('soil') ||
            data.raw_data?.farmer_id === farmer._id.toString()
          )
        );

        return {
          id: farmer._id.toString(),
          name: farmer.name,
          email: farmer.email,
          role: farmer.role,
          parcelLocation: farmer.parcelLocation || '',
          soilType: farmer.soilType || '',
          crops: farmer.crops || [],
          areaM2: farmer.areaM2 || 0,
          hasCompletedFarmerForm: farmer.hasCompletedFarmerForm === true,
          createdAt: farmer.createdAt,
          updatedAt: farmer.updatedAt,
          sensorData: relevantSensorData.slice(0, 10), // Dernières 10 lectures
          lastSensorReading: relevantSensorData.length > 0 ? relevantSensorData[0] : null,
          totalSensorReadings: relevantSensorData.length
        };
      })
    );

    res.json({
      message: 'Fermiers récupérés avec leurs données',
      farmers: farmersWithSensorData,
      count: farmersWithSensorData.length
    });
  } catch (error) {
    console.error('❌ Erreur récupération fermiers:', error.message);
    res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message
    });
  }
});

// GET - Détails complets d'un fermier spécifique avec toutes ses données
router.get('/farmers/:id', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    const { id } = req.params;

    // Récupérer le fermier
    const farmer = await User.findById(id).select('-password');
    
    if (!farmer || farmer.role !== 'farmer') {
      return res.status(404).json({ message: 'Fermier non trouvé' });
    }

    // Récupérer toutes les données de capteur pour ce fermier
    const limit = parseInt(req.query.limit) || 100;
    const sensorData = await Capteur.find()
      .sort({ timestamp_mesure: -1 })
      .limit(limit);

    // Filtrer les données pertinentes pour ce fermier
    const relevantSensorData = sensorData.filter(data => 
      data.device_id && (
        data.device_id.includes('farm') || 
        data.device_id.includes('soil') ||
        data.raw_data?.farmer_id === farmer._id.toString()
      )
    );

    // Statistiques des capteurs
    const sensorStats = {
      totalReadings: relevantSensorData.length,
      lastReading: relevantSensorData.length > 0 ? relevantSensorData[0] : null,
      averageTemperature: relevantSensorData.length > 0 
        ? relevantSensorData.reduce((sum, d) => sum + (d.temperature || 0), 0) / relevantSensorData.filter(d => d.temperature).length
        : 0,
      averageHumidity: relevantSensorData.length > 0
        ? relevantSensorData.reduce((sum, d) => sum + (d.humidite || 0), 0) / relevantSensorData.filter(d => d.humidite).length
        : 0,
      averageSoilMoisture: relevantSensorData.length > 0
        ? relevantSensorData.reduce((sum, d) => sum + (d.humidite_sol || 0), 0) / relevantSensorData.filter(d => d.humidite_sol).length
        : 0
    };

    const farmerDetails = {
      id: farmer._id.toString(),
      name: farmer.name,
      email: farmer.email,
      role: farmer.role,
      parcelLocation: farmer.parcelLocation || '',
      soilType: farmer.soilType || '',
      crops: farmer.crops || [],
      areaM2: farmer.areaM2 || 0,
      hasCompletedFarmerForm: farmer.hasCompletedFarmerForm === true,
      createdAt: farmer.createdAt,
      updatedAt: farmer.updatedAt,
      sensorData: relevantSensorData,
      sensorStats: sensorStats
    };

    res.json({
      message: 'Détails du fermier récupérés',
      farmer: farmerDetails
    });
  } catch (error) {
    console.error('❌ Erreur récupération détails fermier:', error.message);
    res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message
    });
  }
});

// GET - Statistiques globales pour le dashboard admin
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
    }

    // Statistiques utilisateurs
    const totalUsers = await User.countDocuments();
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    // Statistiques fermiers avec formulaire complété
    const farmersWithProfile = await User.countDocuments({ 
      role: 'farmer', 
      hasCompletedFarmerForm: true 
    });

    // Statistiques capteurs
    const totalSensorReadings = await Capteur.countDocuments();
    const recentReadings = await Capteur.find()
      .sort({ timestamp_mesure: -1 })
      .limit(100);

    // Devices uniques
    const uniqueDevices = [...new Set(recentReadings.map(r => r.device_id).filter(Boolean))];

    // Statistiques temporelles
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const readingsLast24h = await Capteur.countDocuments({ 
      timestamp_mesure: { $gte: last24Hours } 
    });

    const stats = {
      users: {
        total: totalUsers,
        farmers: totalFarmers,
        admins: totalAdmins,
        farmersWithProfile: farmersWithProfile,
        farmersWithoutProfile: totalFarmers - farmersWithProfile
      },
      sensors: {
        totalReadings: totalSensorReadings,
        readingsLast24h: readingsLast24h,
        uniqueDevices: uniqueDevices.length,
        devices: uniqueDevices
      },
      completion: {
        profileCompletionRate: totalFarmers > 0 ? (farmersWithProfile / totalFarmers) * 100 : 0
      }
    };

    res.json({
      message: 'Statistiques admin récupérées',
      stats: stats
    });
  } catch (error) {
    console.error('❌ Erreur récupération statistiques:', error.message);
    res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message
    });
  }
});

// Mettre à jour un utilisateur avec suivi des changements
router.put('/users/:id', /* auth, */ trackCropChanges, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(
      id, 
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Récupérer l'historique des cultures d'un utilisateur
router.get('/users/:userId/history', /* auth, */ getUserCropHistory);

module.exports = router;

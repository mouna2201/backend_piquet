const CropHistory = require('../models/CropHistory');
const User = require('../models/User');

// Middleware : enregistre les changements de profil (culture, localisation, sol, superficie)
// avant la mise à jour de l'utilisateur dans routes/users.js
const trackCropChanges = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const {
      parcelLocation,
      soilType,
      crops,
      areaM2,
    } = req.body;

    const recordChange = async (changeType, oldVal, newVal) => {
      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) {
        return;
      }

      const entry = new CropHistory({
        userId: user._id,
        changeType,
        oldValue: oldVal,
        newValue: newVal,
      });

      await entry.save();
    };

    // Localisation
    if (parcelLocation !== undefined && parcelLocation !== user.parcelLocation) {
      await recordChange('location', user.parcelLocation, parcelLocation);
    }

    // Type de sol
    if (soilType !== undefined && soilType !== user.soilType) {
      await recordChange('soil', user.soilType, soilType);
    }

    // Cultures
    if (Array.isArray(crops)) {
      const oldCrops = user.crops || [];
      const hasChanged = JSON.stringify([...oldCrops].sort()) !== JSON.stringify([...crops].sort());
      if (hasChanged) {
        await recordChange('crop', oldCrops, crops);
      }
    }

    // Superficie
    if (typeof areaM2 === 'number' && areaM2 !== user.areaM2) {
      await recordChange('area', user.areaM2, areaM2);
    }

    // On laisse la route principale faire la mise à jour réelle
    next();
  } catch (error) {
    console.error('❌ Erreur trackCropChanges:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
};

// Contrôleur : récupérer l'historique des cultures d'un utilisateur (admin / outils)
const getUserCropHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, changeType } = req.query;

    const query = { userId };
    if (changeType) {
      query.changeType = changeType;
    }

    const history = await CropHistory.find(query)
      .sort({ changedAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({
      message: 'Historique cultures récupéré',
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error('❌ Erreur getUserCropHistory:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
};

module.exports = {
  trackCropChanges,
  getUserCropHistory,
};

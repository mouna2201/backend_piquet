const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { 
  getUserCropHistory, 
  trackCropChanges 
} = require('../controllers/cropHistoryController');

// éventuellement un middleware d'auth: const auth = require('../middleware/auth');

// Récupérer tous les utilisateurs (avec filtrage par rôle)
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

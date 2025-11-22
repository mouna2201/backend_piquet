const express = require('express');

const router = express.Router();
const User = require('../models/User');
// éventuellement un middleware d'auth: const auth = require('../middleware/auth');

router.get('/users', /* auth, */ async (req, res) => {
  try {
    const role = req.query.role;

    const filter = {};
    if (role) filter.role = role; // role=farmer

    const users = await User.find(filter).select('-password');

    // Format 2 : objet avec "users" (compatible Flutter)
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;

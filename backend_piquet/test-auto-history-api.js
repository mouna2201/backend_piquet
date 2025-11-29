require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const CropHistoryRecord = require('./models/CropHistoryRecord');

// Simuler les routes API pour tester
const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_super_securise_changez_moi';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token invalide' });
    }
    req.user = decoded;
    next();
  });
};

// Copier la logique exacte de PUT /api/farmer/profile
app.put('/api/farmer/profile', authenticateToken, async (req, res) => {
  try {
    const { parcelLocation, soilType, crops, areaM2 } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si les cultures ont changé pour enregistrer dans l'historique
    const oldCrops = user.crops || [];
    const newCrops = Array.isArray(crops) ? crops : user.crops;
    const cropsChanged = JSON.stringify(oldCrops.sort()) !== JSON.stringify(newCrops.sort());

    user.parcelLocation = parcelLocation ?? user.parcelLocation;
    user.soilType = soilType ?? user.soilType;
    user.crops = newCrops;
    user.areaM2 = typeof areaM2 === 'number' ? areaM2 : user.areaM2;
    user.hasCompletedFarmerForm = true;

    await user.save();

    // Enregistrer dans l'historique si les cultures ont changé
    if (cropsChanged && newCrops.length > 0) {
      try {
        for (const cropType of newCrops) {
          const record = new CropHistoryRecord({
            userId: user._id,
            location: user.parcelLocation || 'Non spécifiée',
            cropType: cropType,
            area: user.areaM2 || 0,
            soilType: user.soilType || 'Non spécifié',
            waterAmount: Math.round((user.areaM2 || 0) * 0.6),
          });
          await record.save();
        }
        console.log(`📋 Historique enregistré: ${newCrops.length} culture(s) pour l'utilisateur ${user._id}`);
      } catch (historyError) {
        console.error('❌ Erreur enregistrement historique:', historyError.message);
      }
    }

    return res.json({
      message: 'Profil fermier mis à jour',
      parcelLocation: user.parcelLocation,
      soilType: user.soilType,
      crops: user.crops,
      areaM2: user.areaM2,
      hasCompletedFarmerForm: user.hasCompletedFarmerForm,
      historyRecorded: cropsChanged && newCrops.length > 0,
    });
  } catch (error) {
    console.error('❌ Erreur PUT /api/farmer/profile:', error.message);
    return res.status(500).json({
      message: 'Erreur du serveur',
      error: error.message,
    });
  }
});

async function testAutoHistoryAPI() {
  try {
    console.log('🧪 Test de l\'enregistrement automatique via API...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connecté à MongoDB');

    // Get the test user
    const userId = '692236fba917caa8d7de1c7f';
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('❌ Utilisateur de test non trouvé');
      return;
    }

    console.log(`✅ Utilisateur trouvé: ${user.name} (${user.email})`);
    console.log(`📋 Cultures actuelles: ${JSON.stringify(user.crops)}`);

    // Créer un token JWT pour l'authentification
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    console.log('🔐 Token JWT créé');

    // Données de test pour la mise à jour
    const updateData = {
      parcelLocation: 'Parcelle de Test API',
      soilType: 'Sableux',
      crops: ['Tomates', 'Laitues', 'Carottes'],
      areaM2: 750
    };

    console.log(`🔄 Envoi requête PUT avec nouvelles cultures: ${JSON.stringify(updateData.crops)}`);

    // Simuler l'appel API
    const response = await new Promise((resolve, reject) => {
      const request = {
        headers: {
          'authorization': `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: updateData,
        user: { userId: user._id }
      };

      // Simuler la requête
      const req = {
        headers: request.headers,
        body: request.body,
        user: { userId: user._id }
      };

      const res = {
        json: (data) => resolve(data),
        status: (code) => ({
          json: (data) => reject({ status: code, data })
        })
      };

      // Appeler la fonction middleware
      authenticateToken(req, res, () => {
        // Appeler le handler
        app._router.stack.forEach(layer => {
          if (layer.route && layer.route.path === '/api/farmer/profile' && layer.route.methods.put) {
            layer.route.stack[0].handle(req, res);
          }
        });
      });
    });

    console.log('✅ Réponse API:', response);

    // Vérifier que l'historique a été enregistré
    const historyRecords = await CropHistoryRecord.find({ userId }).sort({ createdAt: -1 });
    console.log(`📊 Nombre d'enregistrements dans l'historique: ${historyRecords.length}`);

    if (historyRecords.length > 0) {
      console.log('\n📋 Enregistrements d\'historique créés:');
      historyRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.cropType} - ${record.location}`);
        console.log(`      Surface: ${record.area}m², Eau: ${record.waterAmount}L`);
        console.log(`      Date: ${record.createdAt}`);
        console.log('   ---');
      });
    }

    console.log('\n✅ Test API terminé avec succès!');

  } catch (error) {
    console.error('❌ Erreur test API:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔚 Test complété');
  }
}

testAutoHistoryAPI();
